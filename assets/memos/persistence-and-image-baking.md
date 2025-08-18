# Persistance des données et mise à jour d’image

## Modèle de persistance Docker
- **Image**: lecture seule; build/commit uniquement. Un  n’inclut pas les volumes.
- **Conteneur**: couche en écriture volatile; perdue à la recréation.
- **Volumes/bind-mounts**: persistants côté hôte; non inclus dans l’image.

## Ce qui est inclus/exclu d’un snapshot
- **Inclus**: paquets apt (), fichiers dans des chemins non montés (ex. ).
- **Exclu**: tout contenu placé dans un volume monté (ex. , ).

## Bonnes pratiques
- Installe ce qui doit être “baked” dans un chemin non monté (ex. ).
- Évite d’installer dans des chemins bind-mountés si l’objectif est le snapshot.

## Étendre l’image (Dockerfile)

up to date, audited 637 packages in 887ms

74 packages are looking for funding
  run `npm fund` for details

11 vulnerabilities (3 moderate, 5 high, 3 critical)

To address all issues possible (including breaking changes), run:
  npm audit fix --force

Some issues need review, and may require choosing
a different dependency.

Run `npm audit` for details.

### Build & push
Moving ./MUTAGEN-SETUP.md to
Moving ./core/context/conscience.md to
Moving ./node_modules/jws/CHANGELOG.md to
Moving ./node_modules/jws/readme.md to
Moving ./node_modules/pend/README.md to
Moving ./node_modules/fd-slicer/CHANGELOG.md to
Moving ./node_modules/fd-slicer/README.md to
Moving ./node_modules/callsites/readme.md to
Moving ./node_modules/triple-beam/CHANGELOG.md to
Moving ./node_modules/triple-beam/README.md to
Moving ./node_modules/node-forge/CHANGELOG.md to
Moving ./node_modules/node-forge/README.md to
Moving ./node_modules/agentkeepalive/README.md to
Moving ./node_modules/zod/README.md to
Moving ./node_modules/styled-jsx/license.md to
Moving ./node_modules/styled-jsx/readme.md to
Moving ./node_modules/simple-swizzle/README.md to
Moving ./node_modules/humanize-ms/History.md to
Moving ./node_modules/humanize-ms/README.md to
Moving ./node_modules/readable-web-to-node-stream/README.md to
Moving ./node_modules/fs-constants/README.md to
Moving ./node_modules/destroy/README.md to
Moving ./node_modules/expr-eval/CHANGELOG.md to
Moving ./node_modules/expr-eval/README.md to
Moving ./node_modules/asn1/README.md to
Moving ./node_modules/globals/readme.md to
Moving ./node_modules/lodash.includes/README.md to
Moving ./node_modules/lodash/README.md to
Moving ./node_modules/lodash/release.md to
Moving ./node_modules/has-unicode/README.md to
Moving ./node_modules/formdata-polyfill/README.md to
Moving ./node_modules/flat/README.md to
Moving ./node_modules/process-nextick-args/license.md to
Moving ./node_modules/process-nextick-args/readme.md to
Moving ./node_modules/shebang-regex/readme.md to
Moving ./node_modules/jwa/README.md to
Moving ./node_modules/web-streams-polyfill/README.md to
Moving ./node_modules/json-parse-even-better-errors/LICENSE.md to
Moving ./node_modules/json-parse-even-better-errors/CHANGELOG.md to
Moving ./node_modules/json-parse-even-better-errors/README.md to
Moving ./node_modules/next/license.md to
Moving ./node_modules/next/README.md to
Moving ./node_modules/aws-sign2/README.md to
Moving ./node_modules/adler-32/README.md to
Moving ./node_modules/toidentifier/HISTORY.md to
Moving ./node_modules/toidentifier/README.md to
Moving ./node_modules/extend/CHANGELOG.md to
Moving ./node_modules/extend/README.md to
Moving ./node_modules/har-validator/README.md to
Moving ./node_modules/make-dir/readme.md to
Moving ./node_modules/strip-ansi/readme.md to
Moving ./node_modules/prebuild-install/CHANGELOG.md to
Moving ./node_modules/prebuild-install/README.md to
Moving ./node_modules/prebuild-install/CONTRIBUTING.md to
Moving ./node_modules/content-type/HISTORY.md to
Moving ./node_modules/content-type/README.md to
Moving ./node_modules/proxy-agent/README.md to
Moving ./node_modules/flatted/README.md to
Moving ./node_modules/langsmith/README.md to
Moving ./node_modules/loose-envify/README.md to
Moving ./node_modules/es-errors/CHANGELOG.md to
Moving ./node_modules/es-errors/README.md to
Moving ./node_modules/node-domexception/README.md to
Moving ./node_modules/agent-base/README.md to
Moving ./node_modules/colorspace/LICENSE.md to
Moving ./node_modules/colorspace/README.md to
Moving ./node_modules/text-decoder/README.md to
Moving ./node_modules/ms/license.md to
Moving ./node_modules/ms/readme.md to
Moving ./node_modules/content-disposition/HISTORY.md to
Moving ./node_modules/content-disposition/README.md to
Moving ./node_modules/frac/README.md to
Moving ./node_modules/math-intrinsics/CHANGELOG.md to
Moving ./node_modules/math-intrinsics/README.md to
Moving ./node_modules/methods/HISTORY.md to
Moving ./node_modules/methods/README.md to
Moving ./node_modules/playwright-core/README.md to
Moving ./node_modules/prelude-ls/CHANGELOG.md to
Moving ./node_modules/prelude-ls/README.md to
Moving ./node_modules/noop-logger/History.md to
Moving ./node_modules/noop-logger/Readme.md to
Moving ./node_modules/dotenv/CHANGELOG.md to
Moving ./node_modules/dotenv/README.md to
Moving ./node_modules/dotenv/README-es.md to
Moving ./node_modules/dotenv/SECURITY.md to
Moving ./node_modules/escape-string-regexp/readme.md to
Moving ./node_modules/lodash.isstring/README.md to
Moving ./node_modules/has-tostringtag/CHANGELOG.md to
Moving ./node_modules/has-tostringtag/README.md to
Moving ./node_modules/abort-controller/README.md to
Moving ./node_modules/strip-json-comments/readme.md to
Moving ./node_modules/lru-cache/README.md to
Moving ./node_modules/imurmurhash/README.md to
Moving ./node_modules/bl/LICENSE.md to
Moving ./node_modules/bl/README.md to
Moving ./node_modules/eslint-scope/README.md to
Moving ./node_modules/chownr/README.md to
Moving ./node_modules/commander/Readme.md to
Moving ./node_modules/punycode/README.md to
Moving ./node_modules/proxy-addr/HISTORY.md to
Moving ./node_modules/proxy-addr/README.md to
Moving ./node_modules/depd/History.md to
Moving ./node_modules/depd/Readme.md to
Moving ./node_modules/core-util-is/README.md to
Moving ./node_modules/escalade/readme.md to
Moving ./node_modules/node-fetch/LICENSE.md to
Moving ./node_modules/node-fetch/README.md to
Moving ./node_modules/wmf/README.md to
Moving ./node_modules/ip-address/README.md to
Moving ./node_modules/range-parser/HISTORY.md to
Moving ./node_modules/range-parser/README.md to
Moving ./node_modules/color-string/README.md to
Moving ./node_modules/side-channel-list/CHANGELOG.md to
Moving ./node_modules/side-channel-list/README.md to
Moving ./node_modules/fast-json-stable-stringify/README.md to
Moving ./node_modules/error-ex/README.md to
Moving ./node_modules/deep-extend/CHANGELOG.md to
Moving ./node_modules/deep-extend/README.md to
Moving ./node_modules/detect-libc/README.md to
Moving ./node_modules/balanced-match/LICENSE.md to
Moving ./node_modules/balanced-match/README.md to
Moving ./node_modules/path-exists/readme.md to
Moving ./node_modules/progress/CHANGELOG.md to
Moving ./node_modules/progress/Readme.md to
Moving ./node_modules/bcrypt-pbkdf/README.md to
Moving ./node_modules/bcrypt-pbkdf/CONTRIBUTING.md to
Moving ./node_modules/lodash.once/README.md to
Moving ./node_modules/bytes/History.md to
Moving ./node_modules/bytes/Readme.md to
Moving ./node_modules/retry/README.md to
Moving ./node_modules/call-bind-apply-helpers/CHANGELOG.md to
Moving ./node_modules/call-bind-apply-helpers/README.md to
Moving ./node_modules/base64-js/README.md to
Moving ./node_modules/aws4/README.md to
Moving ./node_modules/puppeteer/README.md to
Moving ./node_modules/parse-json/readme.md to
Moving ./node_modules/openapi-types/CHANGELOG.md to
Moving ./node_modules/openapi-types/README.md to
Moving ./node_modules/nanoid/README.md to
Moving ./node_modules/har-schema/README.md to
Moving ./node_modules/buffer-crc32/README.md to
Moving ./node_modules/acorn/CHANGELOG.md to
Moving ./node_modules/acorn/README.md to
Moving ./node_modules/ast-types/README.md to
Moving ./node_modules/file-entry-cache/README.md to
Moving ./node_modules/merge/README.md to
Moving ./node_modules/regenerator-runtime/README.md to
Moving ./node_modules/express/History.md to
Moving ./node_modules/express/Readme.md to
Moving ./node_modules/has-ansi/readme.md to
Moving ./node_modules/langchain/README.md to
Moving ./node_modules/encodeurl/README.md to
Moving ./node_modules/signal-exit/README.md to
Moving ./node_modules/extract-zip/readme.md to
Moving ./node_modules/wrap-ansi/readme.md to
Moving ./node_modules/y18n/CHANGELOG.md to
Moving ./node_modules/y18n/README.md to
Moving ./node_modules/once/README.md to
Moving ./node_modules/bare-path/README.md to
Moving ./node_modules/lodash.isboolean/README.md to
Moving ./node_modules/proxy-from-env/README.md to
Moving ./node_modules/gaxios/CHANGELOG.md to
Moving ./node_modules/gaxios/README.md to
Moving ./node_modules/crc-32/README.md to
Moving ./node_modules/text-hex/README.md to
Moving ./node_modules/ignore/README.md to
Moving ./node_modules/retry-axios/README.md to
Moving ./node_modules/get-uri/README.md to
Moving ./node_modules/extsprintf/README.md to
Moving ./node_modules/esrecurse/README.md to
Moving ./node_modules/string_decoder/README.md to
Moving ./node_modules/merge-descriptors/HISTORY.md to
Moving ./node_modules/merge-descriptors/README.md to
Moving ./node_modules/tslib/README.md to
Moving ./node_modules/tslib/SECURITY.md to
Moving ./node_modules/file-type/readme.md to
Moving ./node_modules/graphql-request/README.md to
Moving ./node_modules/array-flatten/README.md to
Moving ./node_modules/argparse/CHANGELOG.md to
Moving ./node_modules/argparse/README.md to
Moving ./node_modules/nan/LICENSE.md to
Moving ./node_modules/nan/CHANGELOG.md to
Moving ./node_modules/nan/README.md to
Moving ./node_modules/safe-buffer/README.md to
Moving ./node_modules/kuler/README.md to
Moving ./node_modules/function-bind/CHANGELOG.md to
Moving ./node_modules/function-bind/README.md to
Moving ./node_modules/caseless/README.md to
Moving ./node_modules/is-glob/README.md to
Moving ./node_modules/getpass/README.md to
Moving ./node_modules/ee-first/README.md to
Moving ./node_modules/socks-proxy-agent/README.md to
Moving ./node_modules/is-fullwidth-code-point/readme.md to
Moving ./node_modules/color/README.md to
Moving ./node_modules/env-paths/readme.md to
Moving ./node_modules/flat-cache/changelog.md to
Moving ./node_modules/flat-cache/README.md to
Moving ./node_modules/querystringify/README.md to
Moving ./node_modules/yargs-parser/CHANGELOG.md to
Moving ./node_modules/yargs-parser/README.md to
Moving ./node_modules/inherits/README.md to
Moving ./node_modules/json-bigint/README.md to
Moving ./node_modules/psl/README.md to
Moving ./node_modules/psl/SECURITY.md to
Moving ./node_modules/lodash.isinteger/README.md to
Moving ./node_modules/jsonwebtoken/README.md to
Moving ./node_modules/tesseract.js/LICENSE.md to
Moving ./node_modules/tesseract.js/README.md to
Moving ./node_modules/iconv-lite/Changelog.md to
Moving ./node_modules/iconv-lite/README.md to
Moving ./node_modules/codepage/README.md to
Moving ./node_modules/color-name/README.md to
Moving ./node_modules/es-define-property/CHANGELOG.md to
Moving ./node_modules/es-define-property/README.md to
Moving ./node_modules/stack-trace/Readme.md to
Moving ./node_modules/decamelize/readme.md to
Moving ./node_modules/async/CHANGELOG.md to
Moving ./node_modules/async/README.md to
Moving ./node_modules/postcss/README.md to
Moving ./node_modules/p-locate/readme.md to
Moving ./node_modules/fresh/HISTORY.md to
Moving ./node_modules/fresh/README.md to
Moving ./node_modules/get-intrinsic/CHANGELOG.md to
Moving ./node_modules/get-intrinsic/README.md to
Moving ./node_modules/ssh2/SFTP.md to
Moving ./node_modules/ssh2/README.md to
Moving ./node_modules/requires-port/README.md to
Moving ./node_modules/keyv/README.md to
Moving ./node_modules/one-time/README.md to
Moving ./node_modules/fn.name/README.md to
Moving ./node_modules/xlsx/CHANGELOG.md to
Moving ./node_modules/xlsx/README.md to
Moving ./node_modules/zod-to-json-schema/changelog.md to
Moving ./node_modules/zod-to-json-schema/README.md to
Moving ./node_modules/zod-to-json-schema/contributing.md to
Moving ./node_modules/zod-to-json-schema/SECURITY.md to
Moving ./node_modules/decompress-response/readme.md to
Moving ./node_modules/simple-get/README.md to
Moving ./node_modules/qs/LICENSE.md to
Moving ./node_modules/qs/CHANGELOG.md to
Moving ./node_modules/qs/README.md to
Moving ./node_modules/js-yaml/CHANGELOG.md to
Moving ./node_modules/js-yaml/README.md to
Moving ./node_modules/eslint-visitor-keys/README.md to
Moving ./node_modules/whatwg-url/README.md to
Moving ./node_modules/call-bound/CHANGELOG.md to
Moving ./node_modules/call-bound/README.md to
Moving ./node_modules/p-finally/readme.md to
Moving ./node_modules/scheduler/README.md to
Moving ./node_modules/js-tiktoken/README.md to
Moving ./node_modules/lodash.isnumber/README.md to
Moving ./node_modules/smart-buffer/README.md to
Moving ./node_modules/parent-module/readme.md to
Moving ./node_modules/p-retry/readme.md to
Moving ./node_modules/devtools-protocol/README.md to
Moving ./node_modules/combined-stream/Readme.md to
Moving ./node_modules/dunder-proto/CHANGELOG.md to
Moving ./node_modules/dunder-proto/README.md to
Moving ./node_modules/encoding/README.md to
Moving ./node_modules/path-to-regexp/Readme.md to
Moving ./node_modules/hasown/CHANGELOG.md to
Moving ./node_modules/hasown/README.md to
Moving ./node_modules/safer-buffer/Porting-Buffer.md to
Moving ./node_modules/safer-buffer/Readme.md to
Moving ./node_modules/side-channel-weakmap/CHANGELOG.md to
Moving ./node_modules/side-channel-weakmap/README.md to
Moving ./node_modules/tar-stream/README.md to
Moving ./node_modules/deepmerge/changelog.md to
Moving ./node_modules/deepmerge/readme.md to
Moving ./node_modules/p-limit/readme.md to
Moving ./node_modules/bare-fs/README.md to
Moving ./node_modules/netmask/CHANGELOG.md to
Moving ./node_modules/netmask/CREDITS.md to
Moving ./node_modules/netmask/README.md to
Moving ./node_modules/lodash.camelcase/README.md to
Moving ./node_modules/mime-types/HISTORY.md to
Moving ./node_modules/mime-types/README.md to
Moving ./node_modules/bignumber.js/CHANGELOG.md to
Moving ./node_modules/bignumber.js/LICENCE.md to
Moving ./node_modules/bignumber.js/README.md to
Moving ./node_modules/undici-types/README.md to
Moving ./node_modules/unbzip2-stream/README.md to
Moving ./node_modules/webidl-conversions/LICENSE.md to
Moving ./node_modules/webidl-conversions/README.md to
Moving ./node_modules/json-schema-traverse/README.md to
Moving ./node_modules/is-typedarray/LICENSE.md to
Moving ./node_modules/is-typedarray/README.md to
Moving ./node_modules/end-of-stream/README.md to
Moving ./node_modules/is-url/History.md to
Moving ./node_modules/is-url/Readme.md to
Moving ./node_modules/bare-os/README.md to
Moving ./node_modules/natural-compare/README.md to
Moving ./node_modules/multer/README.md to
Moving ./node_modules/type-is/HISTORY.md to
Moving ./node_modules/type-is/README.md to
Moving ./node_modules/minimist/CHANGELOG.md to
Moving ./node_modules/minimist/README.md to
Moving ./node_modules/mustache/CHANGELOG.md to
Moving ./node_modules/mustache/README.md to
Moving ./node_modules/cpu-features/README.md to
Moving ./node_modules/is-stream/readme.md to
Moving ./node_modules/xtend/README.md to
Moving ./node_modules/playwright/README.md to
Moving ./node_modules/nice-grpc/LICENSE.md to
Moving ./node_modules/nice-grpc/README.md to
Moving ./node_modules/universalify/README.md to
Moving ./node_modules/esutils/README.md to
Moving ./node_modules/find-up/readme.md to
Moving ./node_modules/chalk/readme.md to
Moving ./node_modules/bare-stream/README.md to
Moving ./node_modules/ansi-regex/readme.md to
Moving ./node_modules/mimic-response/readme.md to
Moving ./node_modules/esprima/README.md to
Moving ./node_modules/isomorphic-fetch/README.md to
Moving ./node_modules/has-flag/readme.md to
Moving ./node_modules/supports-color/readme.md to
Moving ./node_modules/basic-ftp/README.md to
Moving ./node_modules/trae/README.md to
Moving ./node_modules/http-signature/http_signing.md to
Moving ./node_modules/http-signature/README.md to
Moving ./node_modules/http-signature/CHANGES.md to
Moving ./node_modules/vary/HISTORY.md to
Moving ./node_modules/vary/README.md to
Moving ./node_modules/node-ssh/LICENSE.md to
Moving ./node_modules/node-ssh/README.md to
Moving ./node_modules/color-convert/CHANGELOG.md to
Moving ./node_modules/color-convert/README.md to
Moving ./node_modules/path-key/readme.md to
Moving ./node_modules/eventemitter3/README.md to
Moving ./node_modules/unpipe/HISTORY.md to
Moving ./node_modules/unpipe/README.md to
Moving ./node_modules/fecha/README.md to
Moving ./node_modules/wasm-feature-detect/README.md to
Moving ./node_modules/brace-expansion/README.md to
Moving ./node_modules/logform/CHANGELOG.md to
Moving ./node_modules/logform/README.md to
Moving ./node_modules/bmp-js/README.md to
Moving ./node_modules/aproba/README.md to
Moving ./node_modules/winston-transport/CHANGELOG.md to
Moving ./node_modules/winston-transport/README.md to
Moving ./node_modules/sb-scandir/LICENSE.md to
Moving ./node_modules/sb-scandir/README.md to
Moving ./node_modules/binary-extensions/readme.md to
Moving ./node_modules/mcp-ssh/README.md to
Moving ./node_modules/get-caller-file/LICENSE.md to
Moving ./node_modules/get-caller-file/README.md to
Moving ./node_modules/react-dom/README.md to
Moving ./node_modules/util-deprecate/History.md to
Moving ./node_modules/util-deprecate/README.md to
Moving ./node_modules/word-wrap/README.md to
Moving ./node_modules/google-auth-library/CHANGELOG.md to
Moving ./node_modules/google-auth-library/README.md to
Moving ./node_modules/has-symbols/CHANGELOG.md to
Moving ./node_modules/has-symbols/README.md to
Moving ./node_modules/weaviate-client/README.md to
Moving ./node_modules/nice-grpc-common/LICENSE.md to
Moving ./node_modules/nice-grpc-common/README.md to
Moving ./node_modules/picocolors/README.md to
Moving ./node_modules/ieee754/README.md to
Moving ./node_modules/json-buffer/README.md to
Moving ./node_modules/long/README.md to
Moving ./node_modules/raw-body/HISTORY.md to
Moving ./node_modules/raw-body/README.md to
Moving ./node_modules/raw-body/SECURITY.md to
Moving ./node_modules/ssf/README.md to
Moving ./node_modules/bluebird/changelog.md to
Moving ./node_modules/bluebird/README.md to
Moving ./node_modules/lines-and-columns/README.md to
Moving ./node_modules/semver/README.md to
Moving ./node_modules/ini/README.md to
Moving ./node_modules/number-is-nan/readme.md to
Moving ./node_modules/http-errors/HISTORY.md to
Moving ./node_modules/http-errors/README.md to
Moving ./node_modules/append-field/README.md to
Moving ./node_modules/b4a/README.md to
Moving ./node_modules/ecdsa-sig-formatter/README.md to
Moving ./node_modules/node-abi/CODE_OF_CONDUCT.md to
Moving ./node_modules/node-abi/README.md to
Moving ./node_modules/node-abi/CONTRIBUTING.md to
Moving ./node_modules/minimatch/README.md to
Moving ./node_modules/chromium-bidi/README.md to
Moving ./node_modules/accepts/HISTORY.md to
Moving ./node_modules/accepts/README.md to
Moving ./node_modules/estraverse/README.md to
Moving ./node_modules/safe-stable-stringify/readme.md to
Moving ./node_modules/ansi-styles/readme.md to
Moving ./node_modules/cookie-signature/History.md to
Moving ./node_modules/cookie-signature/Readme.md to
Moving ./node_modules/forwarded/HISTORY.md to
Moving ./node_modules/forwarded/README.md to
Moving ./node_modules/js-tokens/CHANGELOG.md to
Moving ./node_modules/js-tokens/README.md to
Moving ./node_modules/negotiator/HISTORY.md to
Moving ./node_modules/negotiator/README.md to
Moving ./node_modules/body-parser/HISTORY.md to
Moving ./node_modules/body-parser/README.md to
Moving ./node_modules/body-parser/SECURITY.md to
Moving ./node_modules/acorn-jsx/README.md to
Moving ./node_modules/gcp-metadata/CHANGELOG.md to
Moving ./node_modules/gcp-metadata/README.md to
Moving ./node_modules/graphql/README.md to
Moving ./node_modules/tesseract.js-core/README.md to
Moving ./node_modules/console-control-strings/README.md to
Moving ./node_modules/fast-fifo/README.md to
Moving ./node_modules/hs/README.md to
Moving ./node_modules/levn/README.md to
Moving ./node_modules/peek-readable/README.md to
Moving ./node_modules/yocto-queue/readme.md to
Moving ./node_modules/lodash.merge/README.md to
Moving ./node_modules/jsprim/README.md to
Moving ./node_modules/jsprim/CONTRIBUTING.md to
Moving ./node_modules/jsprim/CHANGES.md to
Moving ./node_modules/url-parse/README.md to
Moving ./node_modules/utils-merge/README.md to
Moving ./node_modules/side-channel/CHANGELOG.md to
Moving ./node_modules/side-channel/README.md to
Moving ./node_modules/gtoken/CHANGELOG.md to
Moving ./node_modules/gtoken/README.md to
Moving ./node_modules/gauge/CHANGELOG.md to
Moving ./node_modules/gauge/README.md to
Moving ./node_modules/ts-error/README.md to
Moving ./node_modules/protobufjs/README.md to
Moving ./node_modules/token-types/README.md to
Moving ./node_modules/pump/README.md to
Moving ./node_modules/pump/SECURITY.md to
Moving ./node_modules/npmlog/CHANGELOG.md to
Moving ./node_modules/npmlog/README.md to
Moving ./node_modules/cors/HISTORY.md to
Moving ./node_modules/cors/README.md to
Moving ./node_modules/cors/CONTRIBUTING.md to
Moving ./node_modules/get-stream/readme.md to
Moving ./node_modules/sprintf-js/README.md to
Moving ./node_modules/sprintf-js/CONTRIBUTORS.md to
Moving ./node_modules/serve-static/HISTORY.md to
Moving ./node_modules/serve-static/README.md to
Moving ./node_modules/forever-agent/README.md to
Moving ./node_modules/simple-concat/README.md to
Moving ./node_modules/urlpattern-polyfill/README.md to
Moving ./node_modules/optionator/CHANGELOG.md to
Moving ./node_modules/optionator/README.md to
Moving ./node_modules/lodash.isplainobject/README.md to
Moving ./node_modules/word/README.md to
Moving ./node_modules/word/CONTRIBUTING.md to
Moving ./node_modules/buffer-equal-constant-time/README.md to
Moving ./node_modules/uri-js/README.md to
Moving ./node_modules/is-arrayish/README.md to
Moving ./node_modules/cliui/CHANGELOG.md to
Moving ./node_modules/cliui/README.md to
Moving ./node_modules/object-assign/readme.md to
Moving ./node_modules/whatwg-fetch/README.md to
Moving ./node_modules/ecc-jsbn/README.md to
Moving ./node_modules/get-proto/CHANGELOG.md to
Moving ./node_modules/get-proto/README.md to
Moving ./node_modules/form-data/CHANGELOG.md to
Moving ./node_modules/form-data/README.md to
Moving ./node_modules/robotjs/LICENSE.md to
Moving ./node_modules/robotjs/CHANGELOG.md to
Moving ./node_modules/robotjs/README.md to
Moving ./node_modules/yaml/README.md to
Moving ./node_modules/sshpk/README.md to
Moving ./node_modules/delayed-stream/Readme.md to
Moving ./node_modules/cross-spawn/README.md to
Moving ./node_modules/mime/CHANGELOG.md to
Moving ./node_modules/mime/README.md to
Moving ./node_modules/request/CHANGELOG.md to
Moving ./node_modules/request/README.md to
Moving ./node_modules/yargs/README.md to
Moving ./node_modules/pac-proxy-agent/README.md to
Moving ./node_modules/request-promise/README.md to
Moving ./node_modules/asynckit/README.md to
Moving ./node_modules/event-target-shim/README.md to
Moving ./node_modules/tar-fs/README.md to
Moving ./node_modules/ipaddr.js/README.md to
Moving ./node_modules/espree/README.md to
Moving ./node_modules/socks/README.md to
Moving ./node_modules/eslint/README.md to
Moving ./node_modules/esquery/README.md to
Moving ./node_modules/import-fresh/readme.md to
Moving ./node_modules/cookie/README.md to
Moving ./node_modules/cookie/SECURITY.md to
Moving ./node_modules/form-data-encoder/readme.md to
Moving ./node_modules/fast-levenshtein/LICENSE.md to
Moving ./node_modules/fast-levenshtein/README.md to
Moving ./node_modules/delegates/History.md to
Moving ./node_modules/delegates/Readme.md to
Moving ./node_modules/code-point-at/readme.md to
Moving ./node_modules/streamsearch/README.md to
Moving ./node_modules/source-map/CHANGELOG.md to
Moving ./node_modules/source-map/README.md to
Moving ./node_modules/wide-align/README.md to
Moving ./node_modules/tweetnacl/AUTHORS.md to
Moving ./node_modules/tweetnacl/CHANGELOG.md to
Moving ./node_modules/tweetnacl/PULL_REQUEST_TEMPLATE.md to
Moving ./node_modules/tweetnacl/README.md to
Moving ./node_modules/simple-wcswidth/README.md to
Moving ./node_modules/degenerator/README.md to
Moving ./node_modules/puppeteer-core/README.md to
Moving ./node_modules/escodegen/README.md to
Moving ./node_modules/nice-grpc-client-middleware-retry/LICENSE.md to
Moving ./node_modules/nice-grpc-client-middleware-retry/README.md to
Moving ./node_modules/cosmiconfig/README.md to
Moving ./node_modules/gopd/CHANGELOG.md to
Moving ./node_modules/gopd/README.md to
Moving ./node_modules/busboy/README.md to
Moving ./node_modules/escape-html/Readme.md to
Moving ./node_modules/statuses/HISTORY.md to
Moving ./node_modules/statuses/README.md to
Moving ./node_modules/https-proxy-agent/README.md to
Moving ./node_modules/string-width/readme.md to
Moving ./node_modules/zlibjs/README.en.md to
Moving ./node_modules/zlibjs/ChangeLog.md to
Moving ./node_modules/zlibjs/README.md to
Moving ./node_modules/streamx/README.md to
Moving ./node_modules/events/History.md to
Moving ./node_modules/events/Readme.md to
Moving ./node_modules/events/security.md to
Moving ./node_modules/formdata-node/readme.md to
Moving ./node_modules/parseurl/HISTORY.md to
Moving ./node_modules/parseurl/README.md to
Moving ./node_modules/jsonpointer/LICENSE.md to
Moving ./node_modules/jsonpointer/README.md to
Moving ./node_modules/etag/HISTORY.md to
Moving ./node_modules/etag/README.md to
Moving ./node_modules/cross-fetch/README.md to
Moving ./node_modules/yauzl/README.md to
Moving ./node_modules/follow-redirects/README.md to
Moving ./node_modules/camelcase/readme.md to
Moving ./node_modules/isarray/README.md to
Moving ./node_modules/concat-stream/readme.md to
Moving ./node_modules/wrappy/README.md to
Moving ./node_modules/shell-escape/README.md to
Moving ./node_modules/http-proxy-agent/README.md to
Moving ./node_modules/isstream/LICENSE.md to
Moving ./node_modules/isstream/README.md to
Moving ./node_modules/opencollective-postinstall/README.md to
Moving ./node_modules/json-stringify-safe/CHANGELOG.md to
Moving ./node_modules/json-stringify-safe/README.md to
Moving ./node_modules/resolve-from/readme.md to
Moving ./node_modules/verror/README.md to
Moving ./node_modules/verror/CONTRIBUTING.md to
Moving ./node_modules/verror/CHANGES.md to
Moving ./node_modules/send/HISTORY.md to
Moving ./node_modules/send/README.md to
Moving ./node_modules/send/SECURITY.md to
Moving ./node_modules/is-extglob/README.md to
Moving ./node_modules/data-uri-to-buffer/README.md to
Moving ./node_modules/uuid/LICENSE.md to
Moving ./node_modules/uuid/CHANGELOG.md to
Moving ./node_modules/uuid/README.md to
Moving ./node_modules/cfb/README.md to
Moving ./node_modules/abort-controller-x/LICENSE.md to
Moving ./node_modules/abort-controller-x/README.md to
Moving ./node_modules/finalhandler/HISTORY.md to
Moving ./node_modules/finalhandler/README.md to
Moving ./node_modules/finalhandler/SECURITY.md to
Moving ./node_modules/rc/README.md to
Moving ./node_modules/fetch-blob/README.md to
Moving ./node_modules/set-blocking/CHANGELOG.md to
Moving ./node_modules/set-blocking/README.md to
Moving ./node_modules/sb-promise-queue/LICENSE.md to
Moving ./node_modules/sb-promise-queue/README.md to
Moving ./node_modules/buildcheck/README.md to
Moving ./node_modules/caniuse-lite/README.md to
Moving ./node_modules/es-set-tostringtag/CHANGELOG.md to
Moving ./node_modules/es-set-tostringtag/README.md to
Moving ./node_modules/assert-plus/README.md to
Moving ./node_modules/assert-plus/CHANGES.md to
Moving ./node_modules/console-table-printer/README.md to
Moving ./node_modules/tough-cookie/README.md to
Moving ./node_modules/enabled/README.md to
Moving ./node_modules/react/README.md to
Moving ./node_modules/axios/CHANGELOG.md to
Moving ./node_modules/axios/README.md to
Moving ./node_modules/axios/MIGRATION_GUIDE.md to
Moving ./node_modules/buffer-from/readme.md to
Moving ./node_modules/which-pm-runs/README.md to
Moving ./node_modules/oauth-sign/README.md to
Moving ./node_modules/which/CHANGELOG.md to
Moving ./node_modules/which/README.md to
Moving ./node_modules/p-queue/readme.md to
Moving ./node_modules/side-channel-map/CHANGELOG.md to
Moving ./node_modules/side-channel-map/README.md to
Moving ./node_modules/dashdash/README.md to
Moving ./node_modules/dashdash/CHANGES.md to
Moving ./node_modules/ajv/README.md to
Moving ./node_modules/emoji-regex/README.md to
Moving ./node_modules/object-inspect/CHANGELOG.md to
Moving ./node_modules/tunnel-agent/README.md to
Moving ./node_modules/strtok3/README.md to
Moving ./node_modules/readable-stream/GOVERNANCE.md to
Moving ./node_modules/readable-stream/README.md to
Moving ./node_modules/readable-stream/CONTRIBUTING.md to
Moving ./node_modules/type-check/README.md to
Moving ./node_modules/locate-path/readme.md to
Moving ./node_modules/mkdirp-classic/README.md to
Moving ./node_modules/graceful-fs/README.md to
Moving ./node_modules/winston/README.md to
Moving ./node_modules/on-finished/HISTORY.md to
Moving ./node_modules/on-finished/README.md to
Moving ./node_modules/are-we-there-yet/README.md to
Moving ./node_modules/are-we-there-yet/CHANGES.md to
Moving ./node_modules/idb-keyval/README.md to
Moving ./node_modules/expand-template/README.md to
Moving ./node_modules/fsevents/README.md to
Moving ./node_modules/p-timeout/readme.md to
Moving ./node_modules/ws/README.md to
Moving ./node_modules/fast-deep-equal/README.md to
Moving ./node_modules/openai/CHANGELOG.md to
Moving ./node_modules/openai/README.md to
Moving ./node_modules/shebang-command/readme.md to
Moving ./node_modules/performance-now/README.md to
Moving ./node_modules/pac-resolver/README.md to
Moving ./node_modules/napi-build-utils/README.md to
Moving ./node_modules/napi-build-utils/index.md to
Moving ./node_modules/json-schema/README.md to
Moving ./node_modules/process/README.md to
Moving ./node_modules/bare-events/README.md to
Moving ./node_modules/debug/README.md to
Moving ./node_modules/glob-parent/README.md to
Moving ./node_modules/source-map-js/README.md to
Moving ./node_modules/media-typer/HISTORY.md to
Moving ./node_modules/media-typer/README.md to
Moving ./node_modules/buffer/AUTHORS.md to
Moving ./node_modules/buffer/README.md to
Moving ./node_modules/mitt/README.md to
Moving ./node_modules/mime-db/HISTORY.md to
Moving ./node_modules/mime-db/README.md to
Moving ./node_modules/isexe/README.md to
Moving ./node_modules/es-object-atoms/CHANGELOG.md to
Moving ./node_modules/es-object-atoms/README.md to
Moving ./node_modules/jsbn/CHANGELOG.md to
Moving ./node_modules/jsbn/README.md to
Moving ./node_modules/setprototypeof/README.md to
Moving ./docker-commands.md to
Moving ./README.md to
Moving ./assets/files/todo-initial-agi 2.md to
Moving ./assets/files/todo-initial-agi.md to
Moving ./assets/files/architecture-review-plan.md to
Moving ./assets/files/agi-engine-infrastructure.md to

### Compose (ne pas masquer /opt/app)


## Snapshot “live” (sans Dockerfile)
630a94420a6c7ad3c8457674793ae9a46e56756ae22318f7e91bb0e3d0920689
Get:2 https://updates.signal.org/desktop/apt xenial InRelease [5,955 B]
Get:3 https://dl.google.com/linux/chrome/deb stable InRelease [1,825 B]
Get:4 https://apt.releases.hashicorp.com jammy InRelease [12.9 kB]
Get:1 https://packages.microsoft.com/repos/code stable InRelease [3,590 B]
Get:5 http://security.ubuntu.com/ubuntu jammy-security InRelease [129 kB]
Get:6 http://archive.ubuntu.com/ubuntu jammy InRelease [270 kB]
Get:7 https://ppa.launchpadcontent.net/ansible/ansible/ubuntu jammy InRelease [18.0 kB]
Get:8 https://ppa.launchpadcontent.net/kisak/turtle/ubuntu jammy InRelease [18.1 kB]
Get:9 https://ppa.launchpadcontent.net/mozillateam/ppa/ubuntu jammy InRelease [24.6 kB]
Get:10 https://ppa.launchpadcontent.net/nextcloud-devs/client/ubuntu jammy InRelease [24.3 kB]
Get:11 https://updates.signal.org/desktop/apt xenial/main amd64 Packages [87.3 kB]
Get:12 https://ppa.launchpadcontent.net/obsproject/obs-studio/ubuntu jammy InRelease [18.1 kB]
Get:13 https://apt.releases.hashicorp.com jammy/main amd64 Packages [244 kB]
Get:14 https://ppa.launchpadcontent.net/remmina-ppa-team/remmina-next/ubuntu jammy InRelease [18.1 kB]
Get:15 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [128 kB]
Get:16 https://download.sublimetext.com apt/stable/ InRelease [2,536 B]
Err:3 https://dl.google.com/linux/chrome/deb stable InRelease
  The following signatures couldn't be verified because the public key is not available: NO_PUBKEY 32EE5355A6BC6E42
Get:17 http://archive.ubuntu.com/ubuntu jammy-backports InRelease [127 kB]
Get:18 https://packages.microsoft.com/repos/code stable/main arm64 Packages [20.1 kB]
Get:19 https://packages.microsoft.com/repos/code stable/main amd64 Packages [20.1 kB]
Get:20 https://packages.microsoft.com/repos/code stable/main armhf Packages [20.2 kB]
Get:21 https://ppa.launchpadcontent.net/ansible/ansible/ubuntu jammy/main amd64 Packages [1,074 B]
Get:22 https://ppa.launchpadcontent.net/ansible/ansible/ubuntu jammy/main i386 Packages [1,074 B]
Get:23 https://ppa.launchpadcontent.net/kisak/turtle/ubuntu jammy/main i386 Packages [16.0 kB]
Get:24 https://ppa.launchpadcontent.net/kisak/turtle/ubuntu jammy/main amd64 Packages [16.8 kB]
Get:25 http://security.ubuntu.com/ubuntu jammy-security/multiverse i386 Packages [2,201 B]
Get:26 http://security.ubuntu.com/ubuntu jammy-security/multiverse amd64 Packages [48.5 kB]
Get:27 https://ppa.launchpadcontent.net/mozillateam/ppa/ubuntu jammy/main amd64 Packages [45.1 kB]
Get:28 https://ppa.launchpadcontent.net/mozillateam/ppa/ubuntu jammy/main i386 Packages [4,016 B]
Get:29 http://security.ubuntu.com/ubuntu jammy-security/restricted i386 Packages [51.4 kB]
Get:30 https://ppa.launchpadcontent.net/nextcloud-devs/client/ubuntu jammy/main i386 Packages [4,616 B]
Get:31 https://ppa.launchpadcontent.net/nextcloud-devs/client/ubuntu jammy/main amd64 Packages [6,628 B]
Get:32 http://security.ubuntu.com/ubuntu jammy-security/restricted amd64 Packages [5,111 kB]
Get:33 https://ppa.launchpadcontent.net/obsproject/obs-studio/ubuntu jammy/main amd64 Packages [1,068 B]
Get:34 http://archive.ubuntu.com/ubuntu jammy/universe amd64 Packages [17.5 MB]
Get:35 https://ppa.launchpadcontent.net/remmina-ppa-team/remmina-next/ubuntu jammy/main i386 Packages [3,435 B]
Get:36 https://ppa.launchpadcontent.net/remmina-ppa-team/remmina-next/ubuntu jammy/main amd64 Packages [5,710 B]
Get:37 https://download.sublimetext.com apt/stable/ Packages [12.0 kB]
Get:38 http://security.ubuntu.com/ubuntu jammy-security/main i386 Packages [843 kB]
Get:39 http://security.ubuntu.com/ubuntu jammy-security/main amd64 Packages [3,209 kB]
Get:40 http://security.ubuntu.com/ubuntu jammy-security/universe amd64 Packages [1,271 kB]
Get:41 http://security.ubuntu.com/ubuntu jammy-security/universe i386 Packages [836 kB]
Get:42 http://archive.ubuntu.com/ubuntu jammy/multiverse i386 Packages [134 kB]
Get:43 http://archive.ubuntu.com/ubuntu jammy/restricted amd64 Packages [164 kB]
Get:44 http://archive.ubuntu.com/ubuntu jammy/universe i386 Packages [9,385 kB]
Get:45 http://archive.ubuntu.com/ubuntu jammy/multiverse amd64 Packages [266 kB]
Get:46 http://archive.ubuntu.com/ubuntu jammy/main i386 Packages [1,324 kB]
Get:47 http://archive.ubuntu.com/ubuntu jammy/main amd64 Packages [1,792 kB]
Get:48 http://archive.ubuntu.com/ubuntu jammy/restricted i386 Packages [36.7 kB]
Get:49 http://archive.ubuntu.com/ubuntu jammy-updates/restricted i386 Packages [54.7 kB]
Get:50 http://archive.ubuntu.com/ubuntu jammy-updates/restricted amd64 Packages [5,299 kB]
Get:51 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 Packages [3,521 kB]
Get:52 http://archive.ubuntu.com/ubuntu jammy-updates/multiverse amd64 Packages [75.9 kB]
Get:53 http://archive.ubuntu.com/ubuntu jammy-updates/universe amd64 Packages [1,575 kB]
Get:54 http://archive.ubuntu.com/ubuntu jammy-updates/multiverse i386 Packages [9,619 B]
Get:55 http://archive.ubuntu.com/ubuntu jammy-updates/universe i386 Packages [975 kB]
Get:56 http://archive.ubuntu.com/ubuntu jammy-updates/main i386 Packages [1,062 kB]
Get:57 http://archive.ubuntu.com/ubuntu jammy-backports/main i386 Packages [72.9 kB]
Get:58 http://archive.ubuntu.com/ubuntu jammy-backports/universe amd64 Packages [35.2 kB]
Get:59 http://archive.ubuntu.com/ubuntu jammy-backports/main amd64 Packages [83.2 kB]
Get:60 http://archive.ubuntu.com/ubuntu jammy-backports/universe i386 Packages [21.6 kB]
Reading package lists...
sha256:d07c141b7993f65096577a62a894395c2ba739270579f3f56ca883753e40ecf2
The push refers to repository [docker.io/moicben/agi-engine]
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
7c96677d81fc: Layer already exists
53f670976997: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Waiting
4f4fb700ef54: Waiting
6698060417a8: Waiting
17852a19872b: Layer already exists
4f4fb700ef54: Waiting
6698060417a8: Waiting
4f4fb700ef54: Layer already exists
6698060417a8: Waiting
6698060417a8: Waiting
6698060417a8: Waiting
6698060417a8: Layer already exists
53f670976997: Pushed
staged: digest: sha256:d07c141b7993f65096577a62a894395c2ba739270579f3f56ca883753e40ecf2 size: 1866

## Rappels utiles
[
  {
    "Type": "bind",
    "Source": "/Users/ben/Documents/agi-engine",
    "Destination": "/home/kasm-user/project",
    "Mode": "rw",
    "RW": true,
    "Propagation": "rprivate"
  },
  {
    "Type": "bind",
    "Source": "/Users/ben/Documents/agi-engine/kasm-home",
    "Destination": "/home/kasm-user",
    "Mode": "rw",
    "RW": true,
    "Propagation": "rprivate"
  }
]
sha256:725ac94c17caa6adbf1d4a05bde30b44f2fa232d086e9623e147050adb116aef
The push refers to repository [docker.io/moicben/agi-engine]
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
6698060417a8: Layer already exists
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
4747307f8663: Layer already exists
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
7c96677d81fc: Waiting
4f4fb700ef54: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
bdd0929081df: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
bdd0929081df: Layer already exists
520e6d55c991: Waiting
b8d750e0a94c: Waiting
7c96677d81fc: Layer already exists
4f4fb700ef54: Layer already exists
17852a19872b: Waiting
06b90a533cc0: Waiting
17852a19872b: Waiting
06b90a533cc0: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
520e6d55c991: Waiting
b8d750e0a94c: Waiting
17852a19872b: Waiting
06b90a533cc0: Layer already exists
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
520e6d55c991: Layer already exists
b8d750e0a94c: Waiting
17852a19872b: Layer already exists
5e8443a52b07: Waiting
40056566a677: Waiting
f7ef80b6d81e: Waiting
b8d750e0a94c: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
b8d750e0a94c: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
b8d750e0a94c: Waiting
5e8443a52b07: Waiting
40056566a677: Waiting
b8d750e0a94c: Waiting
b8d750e0a94c: Waiting
5e8443a52b07: Layer already exists
40056566a677: Waiting
40056566a677: Waiting
b8d750e0a94c: Waiting
40056566a677: Waiting
b8d750e0a94c: Layer already exists
40056566a677: Waiting
40056566a677: Layer already exists
f7ef80b6d81e: Pushed
staged: digest: sha256:725ac94c17caa6adbf1d4a05bde30b44f2fa232d086e9623e147050adb116aef size: 3777

## Notes spécifiques au repo
-  monte  sur  (persistance utilisateur).
- Pour “baker” l’app, conserver l’app dans  (non monté) et éviter de bind-mounter  sur ce chemin.
- Les workflows sensibles (identité, paiements, WhatsApp) doivent garder leurs dépendances système dans l’image pour reproductibilité (Mindee/GPT-vision clients, puppeteer, proxies, etc.).
