import AVFoundation
import Speech
import UIKit
import WebKit
import os

enum Log {
    static let speech = Logger(subsystem: "uk.clipt.callassistant", category: "speech")
    static let page = Logger(subsystem: "uk.clipt.callassistant", category: "page")
}

// Apple's speech recogniser, offered to the page as raw words.
//
// The contract (call/native-speech.js is the other half, and owns every
// decision): the page posts {cmd: start|commit|stop|abort}; this streams back
// {type: start|audiostart|partial|final|error|end}.
//
// One recognition request runs for the whole call (a "stream"), and sentences
// are cut out of its transcript wherever the page commits. It used to be one
// request per sentence - measured on his iPhone, every new request went deaf
// for ~1 s while it warmed up, and lost exactly the words that followed a
// sentence break (私, お店までの道案内, まるまるは本日…). A stream is replaced
// only when it must be: at a sentence break once it is old (Apple's servers
// cap a request at one minute), or when it ends on its own.
final class SpeechBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    private let engine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var running = false
    private var session = 0

    // The stream. `live` is what the microphone feeds; the audio thread reads
    // it, so it is guarded by the lock.
    private let lock = NSLock()
    private var live: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var streamId = 0
    private var streamStarted = Date()
    private var streamHeard = false

    // The sentence being heard: the current utterance's transcript after the
    // text already handed over. Measured on his iPhone, Apple's live results
    // are not one growing string:
    //  - after a pause it starts a NEW utterance and the transcript resets to
    //    just the new words (a word-count cut lost the first word of each:
    //    講義を始める -> を始める);
    //  - it rewrites what it already said - revising words, dropping the first
    //    few, or re-sending several sentences as one (taking that for new
    //    speech repeated whole lines).
    // So a new utterance is told apart from a rewrite by how much text they
    // share, and the cut is found by where the handed-over text ends.
    private var transcript = ""
    private var committed = ""
    private var lastSent = ""
    private var seg = 1                 // the page's id for the sentence being heard

    private var options: [String: Any] = [:]
    private var separator = ""
    private var failures = 0
    private var stopping: (session: Int, deadline: DispatchWorkItem)?

    override init() {
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(interrupted(_:)),
                                               name: AVAudioSession.interruptionNotification, object: nil)
    }

    // MARK: messages from the page

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let cmd = body["cmd"] as? String else { return }
        switch cmd {
        case "start": start(body)
        case "commit": commit()
        case "stop": stop(discard: false)
        case "abort": stop(discard: true)
        default: Log.speech.error("unknown command \(cmd, privacy: .public)")
        }
    }

    private func start(_ body: [String: Any]) {
        if let pending = stopping { finishStop(pending.session) }
        session = body["session"] as? Int ?? session + 1
        options = body
        let mine = session
        authorize { [weak self] problem in
            guard let self, mine == self.session else { return }
            if let problem { self.failStart(problem.0, problem.1); return }
            self.begin()
        }
    }

    private func authorize(_ then: @escaping ((String, String)?) -> Void) {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else {
                DispatchQueue.main.async { then(("not-allowed", "Speech recognition is off for this app - Settings > Call Assistant")) }
                return
            }
            AVAudioApplication.requestRecordPermission { granted in
                DispatchQueue.main.async {
                    then(granted ? nil : ("not-allowed", "Microphone is off for this app - Settings > Call Assistant"))
                }
            }
        }
    }

    private func begin() {
        var lang = options["lang"] as? String ?? "ja-JP"
        #if DEBUG
        // The Simulator ships only an en-US speech model; this lets a dev build
        // prove the audio path there (`-speechLangOverride en-US`).
        if let override = UserDefaults.standard.string(forKey: "speechLangOverride") { lang = override }
        #endif
        // Apple's Japanese words come back as separate tokens with no spaces.
        separator = lang.hasPrefix("ja") || lang.hasPrefix("zh") ? "" : " "
        if recognizer?.locale.identifier != lang.replacingOccurrences(of: "-", with: "_") {
            recognizer = SFSpeechRecognizer(locale: Locale(identifier: lang))
        }
        guard let recognizer, recognizer.isAvailable else {
            let supported = SFSpeechRecognizer.supportedLocales().contains { $0.identifier.replacingOccurrences(of: "_", with: "-") == lang }
            failStart("language-not-supported",
                      "Apple speech recognition for \(lang) is not available right now (supported: \(supported), "
                      + "recogniser: \(recognizer != nil), on-device model: \(recognizer?.supportsOnDeviceRecognition ?? false))")
            return
        }
        if !running {
            do {
                // Speaker, not earpiece: the staff's voice comes from the other
                // phone on speakerphone, and Kyoko's lines must reach its mic.
                let audio = AVAudioSession.sharedInstance()
                try audio.setCategory(.playAndRecord, mode: .default,
                                      options: [.defaultToSpeaker, .allowBluetoothHFP])
                try audio.setActive(true)
                let input = engine.inputNode
                let format = input.outputFormat(forBus: 0)
                guard format.channelCount > 0 else { failStart("audio-capture", "No microphone input"); return }
                input.removeTap(onBus: 0)
                input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                    guard let self else { return }
                    self.lock.lock(); let request = self.live; self.lock.unlock()
                    request?.append(buffer)
                }
                engine.prepare()
                try engine.start()
            } catch {
                failStart("audio-capture", error.localizedDescription)
                return
            }
            running = true
            failures = 0
            UIApplication.shared.isIdleTimerDisabled = true    // a call can outlast the auto-lock
            openStream()
        } else {
            commit()
        }
        emit(["type": "start", "session": session])
        emit(["type": "audiostart", "session": session])
        let onDevice = live?.requiresOnDeviceRecognition ?? false
        Log.speech.notice("started \(lang, privacy: .public) onDevice=\(onDevice) model=\(recognizer.supportsOnDeviceRecognition)")
        emit(["type": "info", "onDevice": onDevice, "deviceModel": recognizer.supportsOnDeviceRecognition])
    }

    // MARK: the stream

    private func openStream() {
        guard let recognizer else { return }
        streamId += 1
        let mine = streamId
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.taskHint = .dictation
        request.addsPunctuation = options["punctuation"] as? Bool ?? false
        request.contextualStrings = options["contextualStrings"] as? [String] ?? []
        switch options["onDevice"] as? String ?? "auto" {
        case "device": request.requiresOnDeviceRecognition = true
        case "server": request.requiresOnDeviceRecognition = false
        default: request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        }
        let previous = task
        lock.lock(); live = request; lock.unlock()
        streamStarted = Date()
        streamHeard = false
        transcript = ""
        committed = ""
        lastSent = ""
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            let tokens = result?.bestTranscription.segments.map(\.substring)
            let isFinal = result?.isFinal ?? false
            DispatchQueue.main.async { self?.heard(mine, tokens, isFinal, error) }
        }
        previous?.cancel()      // its words were committed before it was replaced
    }

    // Where the handed-over text ends in the transcript: exactly at its end
    // if nothing before it changed; else just after the last place its final
    // few characters appear (a rewrite moves them); else at its old length.
    private var sentence: String? {
        if committed.isEmpty || transcript.hasPrefix(committed) {
            return trimmed(transcript.dropFirst(committed.count))
        }
        for n in [8, 6, 4, 3] where committed.count >= n {
            if let found = transcript.range(of: String(committed.suffix(n)), options: .backwards) {
                return trimmed(transcript[found.upperBound...])
            }
        }
        return nil
    }

    // The sentence on screen is complete as it stands; nothing of what follows
    // has been handed over.
    private func newUtterance() {
        if !lastSent.isEmpty {
            emit(["type": "final", "seg": seg, "text": lastSent])
            trace("final", lastSent)
            seg += 1
            lastSent = ""
        }
        committed = ""
    }

    // A rewrite shares most of its character pairs with what it replaces; new
    // speech shares some (電話, には - so 30% was too low, measured) but not most.
    // A one-character start shares none, which is right. Should a new line
    // slip through as a "rewrite", `sentence` cannot place it and it is taken
    // as new anyway.
    private func isNewUtterance(from old: String, to new: String) -> Bool {
        // Same first character: Apple revising the word it began with (後 -> 後悔 -> 後期).
        if new.first == old.first { return false }
        let pairs = { (s: String) -> Set<String> in
            let c = Array(s)
            return c.count < 2 ? [] : Set((0..<c.count - 1).map { String(c[$0...$0 + 1]) })
        }
        let fresh = pairs(new)
        guard !fresh.isEmpty else { return !old.contains(new) }
        return Double(fresh.intersection(pairs(old)).count) / Double(fresh.count) < 0.6
    }

    private func trimmed<S: Sequence>(_ s: S) -> String where S.Element == Character {
        String(s).trimmingCharacters(in: .whitespaces)
    }

    private func heard(_ stream: Int, _ tokens: [String]?, _ isFinal: Bool, _ error: Error?) {
        guard stream == streamId else { return }      // a replaced stream: already committed
        if let tokens {
            let next = tokens.joined(separator: separator)
            // New speech, not a rewrite: the sentence on screen is complete as
            // it stands, and nothing of the new utterance has been handed over.
            if !next.isEmpty, !transcript.isEmpty, isNewUtterance(from: transcript, to: next) { newUtterance() }
            transcript = next
            // Nowhere to be found: treat it as new speech. Measured, the old
            // fallback (cut at the old length) cut 17 characters off a new line.
            var text = sentence ?? ""
            if sentence == nil { newUtterance(); text = trimmed(transcript) }
            if !text.isEmpty {
                streamHeard = true
                failures = 0
                if text != lastSent {
                    lastSent = text
                    emit(["type": "partial", "seg": seg, "text": text])
                    trace("partial", text)
                }
            }
        }
        guard isFinal || error != nil else { return }
        // The stream ended by itself: the one-minute cap, the network, or a
        // long silence. Whatever was heard is the sentence; then keep listening.
        if let error { Log.speech.notice("stream \(stream) ended: \(error.localizedDescription, privacy: .public)") }
        flush()
        if let pending = stopping { finishStop(pending.session); return }
        guard running else { return }
        if error != nil && !streamHeard { failures += 1 }
        if failures >= 5 {
            fail("network", error?.localizedDescription ?? "Speech recognition keeps failing")
            stop(discard: true)
            return
        }
        openStream()
    }

    // Hand the sentence heard so far to the page as final, and start the next.
    private func flush() {
        let text = sentence ?? lastSent
        if !text.isEmpty {
            emit(["type": "final", "seg": seg, "text": text])
            trace("final", text)
        }
        seg += 1
        committed = transcript
        lastSent = ""
    }

    private func commit() {
        guard running, !(sentence ?? lastSent).isEmpty else { return }
        flush()
        // An old stream is replaced at a sentence break, where losing the
        // replacement's warm-up costs least - not mid-sentence at Apple's cap.
        let onDevice = live?.requiresOnDeviceRecognition ?? false
        let limit = (options[onDevice ? "rotateDeviceMs" : "rotateServerMs"] as? Double ?? (onDevice ? 240_000 : 50_000)) / 1000
        if Date().timeIntervalSince(streamStarted) > limit { openStream() }
    }

    private func stop(discard: Bool) {
        let stoppedSession = session
        if running {
            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
            running = false
            UIApplication.shared.isIdleTimerDisabled = false
        }
        lock.lock(); let request = live; live = nil; lock.unlock()
        if discard || (sentence ?? lastSent).isEmpty {
            task?.cancel(); task = nil
            streamId += 1
            committed = transcript
            emit(["type": "end", "session": stoppedSession])
            return
        }
        // Let the recogniser finish the sentence in flight before saying
        // "ended": the page pauses the mic around its own speech and must not
        // lose the line the staff were halfway through.
        request?.endAudio()
        let deadline = DispatchWorkItem { [weak self] in self?.finishStop(stoppedSession) }
        stopping = (stoppedSession, deadline)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8, execute: deadline)
    }

    private func finishStop(_ stoppedSession: Int) {
        stopping?.deadline.cancel()
        stopping = nil
        flush()
        task?.cancel(); task = nil
        streamId += 1
        emit(["type": "end", "session": stoppedSession])
    }

    // A phone call takes the microphone. Say so - never look like listening.
    @objc private func interrupted(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self, self.running else { return }
            self.fail("audio-capture", "The microphone was taken (a phone call?) - iPhone apps cannot hear calls on the same phone")
            self.stop(discard: false)
        }
    }

    private func fail(_ code: String, _ message: String) {
        Log.speech.error("\(code, privacy: .public): \(message, privacy: .public)")
        emit(["type": "error", "error": code, "message": message])
    }

    // A browser always follows onerror with onend, and listen.js retries from onend.
    private func failStart(_ code: String, _ message: String) {
        fail(code, message)
        emit(["type": "end", "session": session])
    }

    private func trace(_ kind: String, _ text: String) {
        #if DEBUG
        Log.speech.notice("TRACE \(kind, privacy: .public) seg=\(self.seg) t=\(Date().timeIntervalSince1970, privacy: .public) \(text, privacy: .public)")
        #endif
    }

    private func emit(_ event: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: event),
              let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.__nativeSpeech && window.__nativeSpeech(\(json))")
    }
}
