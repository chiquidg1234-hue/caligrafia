package app.trazo.offline;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MainActivity extends Activity {
    private static final int PICK_FILE = 501, SAVE_DOCUMENT = 502;
    private static final String HOME = "https://trazo.local/";
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final AtomicBoolean saveBusy = new AtomicBoolean(false);
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private File cameraFile;
    private PendingSave pendingSave;

    private static final class PendingSave {
        final String name, safeName, mime;
        final byte[] data;
        PendingSave(String name, String mime, byte[] data) {
            this.name = name; this.safeName = NativePolicy.filename(name);
            this.mime = NativePolicy.mime(mime); this.data = data;
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(232, 237, 242));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(232, 237, 242));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        // API35+ draws edge-to-edge: apply real system/keyboard insets to the whole WebView.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        web.addJavascriptInterface(new NativeBridge(), "TrazoNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return NativePolicy.assetPath(request.getUrl().toString()) == null;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return NativePolicy.assetPath(url) == null;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetResponse(request.getUrl().toString(), request.getMethod());
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                if (NativePolicy.assetPath(url) == null) {
                    view.removeJavascriptInterface("TrazoNative");
                    view.stopLoading();
                }
            }
        });
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return assetResponse(request.getUrl().toString(), request.getMethod());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                launchFilePicker(params);
                return true;
            }
        });
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) ->
                new AlertDialog.Builder(this).setMessage("Usa el botón Exportar de Trazo para guardar este archivo.").setPositiveButton("Entendido", null).show());
        if (Build.VERSION.SDK_INT >= 33) Api33.registerBack(this);
        web.loadUrl(HOME);
    }

    private WebResourceResponse assetResponse(String address, String method) {
        String path = NativePolicy.assetPath(address);
        if (path == null || !"GET".equals(method)) return errorResponse(403, "Forbidden");
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String mime;
        switch (ext) {
            case "html": mime = "text/html"; break;
            case "js": case "mjs": mime = "text/javascript"; break;
            case "css": mime = "text/css"; break;
            case "json": case "webmanifest": mime = "application/json"; break;
            case "svg": mime = "image/svg+xml"; break;
            case "png": mime = "image/png"; break;
            case "jpg": case "jpeg": mime = "image/jpeg"; break;
            case "woff2": mime = "font/woff2"; break;
            case "otf": mime = "font/otf"; break;
            case "wasm": mime = "application/wasm"; break;
            default: mime = "application/octet-stream";
        }
        try {
            InputStream stream = getAssets().open(path);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            headers.put("X-Content-Type-Options", "nosniff");
            headers.put("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'");
            return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, stream);
        } catch (Exception e) { return errorResponse(404, "Not Found"); }
    }

    private WebResourceResponse errorResponse(int code, String status) {
        return new WebResourceResponse("text/plain", "UTF-8", code, status, null,
                new ByteArrayInputStream("Recurso no disponible en Trazo.".getBytes(StandardCharsets.UTF_8)));
    }

    public final class NativeBridge {
        @JavascriptInterface public String version() { return "2.2.0"; }
        @JavascriptInterface public void setProcessing(boolean processing) {
            runOnUiThread(() -> {
                if (processing) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }
        @JavascriptInterface public void saveFile(String encoded, String name, String mime) {
            if (!saveBusy.compareAndSet(false, true)) {
                fileEvent(name, null, "Espera a que termine el guardado anterior."); return;
            }
            io.execute(() -> {
                try {
                    if (encoded == null || encoded.length() > 134217728) throw new IllegalArgumentException("El archivo supera el límite de guardado de 96 MB.");
                    byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                    PendingSave job = new PendingSave(name, mime, bytes);
                    if (Build.VERSION.SDK_INT >= 29) saveToDownloads(job);
                    else runOnUiThread(() -> chooseDocument(job));
                } catch (Exception | OutOfMemoryError e) {
                    saveBusy.set(false);
                    fileEvent(name, null, "No se pudo preparar el archivo: " + errorText(e));
                }
            });
        }
    }

    private void saveToDownloads(PendingSave job) {
        Uri uri = null;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, job.safeName);
            values.put(MediaStore.Downloads.MIME_TYPE, job.mime);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Trazo");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new java.io.IOException("No se pudo crear el archivo en Descargas.");
            writeBytes(uri, job.data);
            ContentValues published = new ContentValues();
            published.put(MediaStore.Downloads.IS_PENDING, 0);
            if (getContentResolver().update(uri, published, null, null) != 1) throw new java.io.IOException("No se pudo publicar el archivo.");
            fileEvent(job.name, uri.toString(), null);
        } catch (Exception e) {
            if (uri != null) try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
            fileEvent(job.name, null, "No se pudo guardar: " + errorText(e));
        } finally { saveBusy.set(false); }
    }

    private void chooseDocument(PendingSave job) {
        try {
            pendingSave = job;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(job.mime).putExtra(Intent.EXTRA_TITLE, job.safeName);
            startActivityForResult(intent, SAVE_DOCUMENT);
        } catch (Exception e) {
            pendingSave = null; saveBusy.set(false);
            fileEvent(job.name, null, "No hay un selector de archivos disponible.");
        }
    }

    private void writeBytes(Uri uri, byte[] bytes) throws Exception {
        try (OutputStream stream = getContentResolver().openOutputStream(uri, "w")) {
            if (stream == null) throw new java.io.IOException("Destino no disponible.");
            stream.write(bytes); stream.flush();
        }
    }

    private String errorText(Throwable error) {
        return error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
    }

    private void fileEvent(String name, String uri, String error) {
        try {
            JSONObject detail = new JSONObject();
            detail.put("name", name == null ? "Trazo-exportacion" : name);
            if (uri != null) detail.put("uri", uri);
            if (error != null) detail.put("error", error);
            String script = "window.dispatchEvent(new CustomEvent('trazo-file-saved',{detail:" + detail.toString() + "}));";
            runOnUiThread(() -> { if (!isDestroyed()) web.evaluateJavascript(script, null); });
        } catch (Exception ignored) { /* JSONObject values are already strings. */ }
    }

    private Intent cameraIntent() {
        try {
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            if (intent.resolveActivity(getPackageManager()) == null) return null;
            File directory = new File(getCacheDir(), "captures");
            if (!directory.exists() && !directory.mkdirs()) return null;
            // Only old camera exports are removed; the current file lives until WebView reads it.
            File[] old = directory.listFiles();
            if (old != null) for (File file : old) if (System.currentTimeMillis() - file.lastModified() > 86400000L) file.delete();
            cameraFile = new File(directory, "capture-" + UUID.randomUUID().toString() + ".jpg");
            if (!cameraFile.createNewFile()) return null;
            cameraUri = new Uri.Builder().scheme("content").authority(CaptureProvider.AUTHORITY)
                    .appendPath("captures").appendPath(cameraFile.getName()).build();
            intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
            intent.setClipData(ClipData.newRawUri("Captura de Trazo", cameraUri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            return intent;
        } catch (Exception e) { cameraUri = null; cameraFile = null; return null; }
    }

    private void launchFilePicker(WebChromeClient.FileChooserParams params) {
        cameraUri = null; cameraFile = null;
        try {
            String[] accepted = params.getAcceptTypes();
            String type = "*/*";
            boolean acceptsImage = false;
            boolean acceptsCustomExtension = false;
            java.util.ArrayList<String> types = new java.util.ArrayList<>();
            if (accepted != null) for (String value : accepted) if (value != null) for (String part : value.split(",")) {
                part = part.trim();
                if (part.startsWith("image/")) acceptsImage = true;
                if (part.startsWith(".")) acceptsCustomExtension = true;
                if (part.contains("/")) types.add(part);
            }
            // Unknown extensions such as .trazo may be labelled octet-stream by a file manager.
            // Keep them selectable; the web importer validates the content before saving it.
            if (types.size() == 1 && !acceptsCustomExtension) type = types.get(0);
            Intent pick = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type);
            if (types.size() > 1 && !acceptsCustomExtension) pick.putExtra(Intent.EXTRA_MIME_TYPES, types.toArray(new String[0]));
            pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);
            Intent camera = acceptsImage ? cameraIntent() : null;
            if (params.isCaptureEnabled() && camera != null) startActivityForResult(camera, PICK_FILE);
            else {
                Intent chooser = Intent.createChooser(pick, "Elegir archivo");
                if (camera != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                startActivityForResult(chooser, PICK_FILE);
            }
        } catch (Exception e) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = null;
            new AlertDialog.Builder(this).setMessage("No se pudo abrir la cámara o el selector de archivos.").setPositiveButton("Entendido", null).show();
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_FILE) {
            Uri[] values = null;
            if (result == RESULT_OK) {
                if (data != null && data.getClipData() != null) {
                    ClipData clips = data.getClipData(); values = new Uri[clips.getItemCount()];
                    for (int i = 0; i < values.length; i++) values[i] = clips.getItemAt(i).getUri();
                } else if (data != null && data.getData() != null) values = new Uri[]{data.getData()};
                else if (cameraUri != null && cameraFile != null && cameraFile.length() > 0) values = new Uri[]{cameraUri};
            }
            // Never give WebView a raw file:// URI returned by a third-party picker.
            if (values != null) for (Uri value : values) if (value == null || !"content".equals(value.getScheme())) { values = null; break; }
            if (fileCallback != null) fileCallback.onReceiveValue(values);
            fileCallback = null;
            if (values == null && cameraFile != null) cameraFile.delete();
            cameraUri = null; cameraFile = null;
        } else if (request == SAVE_DOCUMENT && pendingSave != null) {
            PendingSave job = pendingSave; pendingSave = null;
            Uri uri = data == null ? null : data.getData();
            if (result != RESULT_OK || uri == null || !"content".equals(uri.getScheme())) {
                saveBusy.set(false); fileEvent(job.name, null, "Guardado cancelado."); return;
            }
            io.execute(() -> {
                try { writeBytes(uri, job.data); fileEvent(job.name, uri.toString(), null); }
                catch (Exception e) { fileEvent(job.name, null, "No se pudo guardar: " + errorText(e)); }
                finally { saveBusy.set(false); }
            });
        }
    }

    private void handleBack() {
        if (web.canGoBack()) web.goBack(); else finish();
    }
    private static final class Api33 {
        static void registerBack(MainActivity activity) {
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, activity::handleBack);
        }
    }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        web.removeJavascriptInterface("TrazoNative");
        web.destroy(); io.shutdown();
        super.onDestroy();
    }
}



