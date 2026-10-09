import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Ana sayfa ve ürün sayfaları handoff'taki hazır HTML + betikle çalışır (betik her sayfa yüklemesinde bir kez
    // çalışır). Bu yüzden onlara giden bağlantılar bilerek düz <a> (tam sayfa yükleme), <Link> değil.
    // Görseller zaten optimize edilmiş webp/png çizimler olduğundan <img> de bilerek kullanılıyor.
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Handoff'tan gelen hazır tarayıcı betikleri
    "public/**",
  ]),
]);

export default eslintConfig;
