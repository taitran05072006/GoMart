import java.text.Normalizer;
import java.util.Locale;

public class TestNormalize {
    private static String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        n = n.replaceAll("\\p{M}", ""); // remove diacritics
        return n.toLowerCase(Locale.ROOT).trim();
    }
    public static void main(String[] args) {
        System.out.println(normalize("Đà Nẵng"));
        System.out.println(normalize("Da Nang"));
        System.out.println("da nang".contains("đa nang"));
    }
}
