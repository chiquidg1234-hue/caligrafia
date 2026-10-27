package app.trazo.offline;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;

/** Grants the selected camera access to one temporary JPEG, never general app files. */
public final class CaptureProvider extends ContentProvider {
    public static final String AUTHORITY = "app.trazo.offline.capture";
    @Override public boolean onCreate() { return true; }

    private File resolve(Uri uri) throws FileNotFoundException {
        if (!"content".equals(uri.getScheme()) || !AUTHORITY.equals(uri.getAuthority())
                || uri.getPathSegments().size() != 2 || !"captures".equals(uri.getPathSegments().get(0)))
            throw new FileNotFoundException("URI no permitida");
        String name = uri.getLastPathSegment();
        if (name == null || !name.matches("capture-[a-f0-9-]+\\.jpg")) throw new FileNotFoundException("Nombre no permitido");
        File folder = new File(getContext().getCacheDir(), "captures");
        File file = new File(folder, name);
        try {
            if (!file.getCanonicalFile().getParentFile().equals(folder.getCanonicalFile()))
                throw new FileNotFoundException("Ruta no permitida");
        } catch (IOException e) { throw new FileNotFoundException(e.getMessage()); }
        return file;
    }

    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(resolve(uri), ParcelFileDescriptor.parseMode(mode));
    }
    @Override public String getType(Uri uri) { return "image/jpeg"; }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        try {
            File file = resolve(uri);
            String[] columns = projection == null ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE} : projection;
            MatrixCursor cursor = new MatrixCursor(columns);
            Object[] values = new Object[columns.length];
            for (int i = 0; i < columns.length; i++) {
                if (OpenableColumns.DISPLAY_NAME.equals(columns[i])) values[i] = file.getName();
                else if (OpenableColumns.SIZE.equals(columns[i])) values[i] = file.length();
            }
            cursor.addRow(values);
            return cursor;
        } catch (FileNotFoundException e) { return null; }
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String where, String[] args) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri uri, ContentValues values, String where, String[] args) { throw new UnsupportedOperationException(); }
}
