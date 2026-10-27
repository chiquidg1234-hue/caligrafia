package app.trazo.offline;
public final class NativePolicyTest {
    private static int passed = 0;
    private static void equal(Object expected, Object actual) {
        if (expected == null ? actual != null : !expected.equals(actual)) throw new AssertionError("expected=" + expected + " actual=" + actual);
        passed++;
    }
    public static void main(String[] args) {
        equal("web/index.html", NativePolicy.assetPath("https://trazo.local/"));
        equal("web/index.html", NativePolicy.assetPath("https://trazo.local"));
        equal("web/app.mjs", NativePolicy.assetPath("https://trazo.local/app.mjs?v=2#x"));
        equal("web/vendor/pdf.js", NativePolicy.assetPath("https://trazo.local:443/vendor/pdf.js"));
        equal(null, NativePolicy.assetPath("http://trazo.local/"));
        equal(null, NativePolicy.assetPath("https://evil.example/"));
        equal(null, NativePolicy.assetPath("https://trazo.local.evil.example/"));
        equal(null, NativePolicy.assetPath("https://trazo.local:444/"));
        equal(null, NativePolicy.assetPath("https://user@trazo.local/"));
        equal(null, NativePolicy.assetPath("https://trazo.local/../secret"));
        equal(null, NativePolicy.assetPath("https://trazo.local/%2e%2e/secret"));
        equal(null, NativePolicy.assetPath("https://trazo.local/x/%2e%2e%2fsecret"));
        equal(null, NativePolicy.assetPath("https://trazo.local/%5csecret"));
        equal(null, NativePolicy.assetPath("https://trazo.local/%00"));
        equal(null, NativePolicy.assetPath("file:///sdcard/private.txt"));
        equal(null, NativePolicy.assetPath("javascript:alert(1)"));
        equal(null, NativePolicy.assetPath("https://trazo.local/%GG"));
        equal("Mi letra.otf", NativePolicy.filename("Mi letra.otf"));
        equal("_.._private.pdf", NativePolicy.filename("../../private.pdf"));
        equal("Trazo-exportacion", NativePolicy.filename("..."));
        equal("application/pdf", NativePolicy.mime("application/pdf"));
        equal("application/octet-stream", NativePolicy.mime("text/html\nX-Header: malicious"));
        System.out.println("NativePolicy: " + passed + " checks passed");
    }
}
