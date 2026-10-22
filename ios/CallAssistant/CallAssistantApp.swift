import SwiftUI
import WebKit

// The whole app is one web view on the hosted call assistant. Nothing about the
// call - phrases, stages, translation, layout - lives in Swift, so the phone
// always runs exactly what the web runs.
@main
struct CallAssistantApp: App {
    var body: some Scene {
        WindowGroup {
            ShellView()
                .background(Color("Ground"))
        }
    }
}

enum Shell {
    static let hostedURL = URL(string: "https://clipt25.github.io/japanese-vocab/call-assistant.html")!

    // `-startURL http://localhost:8765/call-assistant.html` (a launch argument)
    // points a dev build at the Mac's serve.py instead.
    static var startURL: URL {
        let base = UserDefaults.standard.string(forKey: "startURL").flatMap(URL.init(string:)) ?? hostedURL
        // Reopen on the restaurant he last had open (?r=...).
        guard let query = UserDefaults.standard.string(forKey: "lastQuery"),
              var parts = URLComponents(url: base, resolvingAgainstBaseURL: false),
              parts.query == nil else { return base }
        parts.query = query
        return parts.url ?? base
    }

    static func isApp(_ url: URL?) -> Bool {
        guard let url else { return false }
        let base = UserDefaults.standard.string(forKey: "startURL").flatMap(URL.init(string:)) ?? hostedURL
        return url.host == base.host && url.port == base.port && url.path == base.path
    }
}

struct ShellView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ShellController { ShellController() }
    func updateUIViewController(_ controller: ShellController, context: Context) {}
}

final class ShellController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!
    private let speech = SpeechBridge()
    private var loadedAt = Date()
    private var ownLoad: URL?        // the navigation load() itself started

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(named: "Ground")

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(speech, name: "speech")
        config.userContentController.add(ConsoleRelay(), name: "console")
        config.userContentController.addUserScript(WKUserScript(
            source: ConsoleRelay.script, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isInspectable = true                 // Safari > Develop, for debugging
        webView.isOpaque = false
        webView.backgroundColor = UIColor(named: "Ground")
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        // Inside the safe area: the page never has to know about the notch.
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        speech.webView = webView
        load(Shell.startURL)

        NotificationCenter.default.addObserver(self, selector: #selector(cameBack),
                                               name: UIApplication.willEnterForegroundNotification, object: nil)
    }

    // Revalidate the page on every load: GitHub Pages says max-age=600, and a
    // phone must never run a ten-minute-old copy after a deploy. The modules
    // themselves are versioned by the import map, so this is one cheap 304.
    private func load(_ url: URL) {
        loadedAt = Date()
        ownLoad = url
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
    }

    // Back after a long time away: pick up any deploy - but never mid-call.
    @objc private func cameBack() {
        guard Date().timeIntervalSince(loadedAt) > 30 * 60 else { return }
        webView.evaluateJavaScript("document.body.dataset.mode") { [weak self] mode, _ in
            guard let self, (mode as? String) != "call" else { return }
            self.load(self.webView.url ?? Shell.startURL)
        }
    }

    // MARK: WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = action.request.url
        // The restaurant picker reloads the page (?r=...): fetch it fresh too.
        // (WebKit does not report a navigation's cache policy back faithfully,
        // so "is this the load I started" is tracked, not inferred.)
        if action.targetFrame?.isMainFrame == true, Shell.isApp(url), let url {
            if url == ownLoad {
                ownLoad = nil
                decisionHandler(.allow)
            } else {
                decisionHandler(.cancel)
                load(url)
            }
            return
        }
        // Anything off-site (a tel: link, a booking page) belongs in Safari or the dialler.
        if action.targetFrame?.isMainFrame == true, let url, !Shell.isApp(url), url.scheme != "about",
           action.navigationType == .linkActivated || url.scheme != "https" && url.scheme != "http" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if Shell.isApp(webView.url), let query = webView.url?.query {
            UserDefaults.standard.set(query, forKey: "lastQuery")
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showOffline(error)
    }

    // iOS reclaims a background web view's process under memory pressure.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        load(webView.url ?? Shell.startURL)
    }

    private func showOffline(_ error: Error) {
        let html = """
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <body style="font:18px -apple-system;padding:24px;background:#FBF9F4;color:#16130E">
        <h2>Can't reach the call assistant</h2><p>\(error.localizedDescription)</p>
        <p><a href="\(Shell.startURL.absoluteString)" style="font-size:20px">Try again</a></p></body>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    // MARK: WKUIDelegate - without these, alert/confirm/prompt silently do
    // nothing in a web view, and the API key is entered through prompt().

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { field in
            field.text = defaultText
            field.autocorrectionType = .no
            field.autocapitalizationType = .none
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
        present(alert, animated: true)
    }
}

// The page's console errors in the device log, so a failure on the phone is
// visible from the Mac (`log stream --predicate 'subsystem == "uk.clipt.callassistant"'`).
final class ConsoleRelay: NSObject, WKScriptMessageHandler {
    static let script = """
    (() => {
      const send = (level, args) => { try { window.webkit.messageHandlers.console.postMessage(
        level + ' ' + args.map(a => a instanceof Error ? a.stack || a.message : typeof a === 'string' ? a : JSON.stringify(a)).join(' ')); } catch {} };
      for (const level of ['log', 'warn', 'error']) {
        const original = console[level];
        console[level] = (...args) => { send(level, args); original.apply(console, args); };
      }
      addEventListener('error', e => send('error', [e.message + ' @ ' + e.filename + ':' + e.lineno]));
      addEventListener('unhandledrejection', e => send('error', ['unhandled: ' + (e.reason?.stack || e.reason)]));
    })();
    """

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        if let line = message.body as? String { Log.page.notice("\(line, privacy: .public)") }
    }
}
