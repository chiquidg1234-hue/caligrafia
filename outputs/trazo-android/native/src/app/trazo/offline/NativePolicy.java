package app.trazo.offline;

import java.net.URI;

/** Shared pure-Java policy, also exercised by the host-side checks. */
public final class NativePolicy {
    private NativePolicy() {}

    public static String assetPath(String address) {
        try {
            URI uri = new URI(address);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !"trazo.local".equalsIgnoreCase(uri.getHost())
                    || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) return null;
            String path = uri.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) return "web/index.html";
            if (!path.startsWith("/") || path.indexOf('\\') >= 0 || path.indexOf('\0') >= 0) return null;
            for (String part : path.split("/")) if ("..".equals(part) || ".".equals(part)) return null;
            return "web" + path;
        } catch (Exception e) { return null; }
    }

    public static String filename(String name) {
        if (name == null || name.trim().isEmpty()) return "Trazo-exportacion";
        String clean = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        while (clean.startsWith(".")) clean = clean.substring(1);
        if (clean.isEmpty()) clean = "Trazo-exportacion";
        return clean.length() <= 160 ? clean : clean.substring(clean.length() - 160);
    }

    public static String mime(String value) {
        return value != null && value.matches("[a-zA-Z0-9!#$&^_.+-]+/[a-zA-Z0-9!#$&^_.+-]+")
                ? value : "application/octet-stream";
    }
}
