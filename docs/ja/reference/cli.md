# CLI リファレンス（`oont`）

`oont` は、Object Ontology のファイルを VS Code の外で検証・エクスポートするコマンドです。ターミナル、CI、Claude Code などの AI コーディングエージェントから使えます。拡張機能と同じコアライブラリを使うので、診断もエクスポートの内容も拡張機能と同じです。

`oont` はローカルのファイルだけを扱います。ネットワークには接続せず、テレメトリも送りません。

## インストール

CLI は npm に **`@yaggytter/object-ontology-cli`**（コマンド名 `oont`）として公開する予定で、まだ公開していません。それまでは、このリポジトリをクローンして実行してください（Node.js 20 以上）。

```sh
git clone https://github.com/yaggytter/vscode-ontology-driven-development.git
cd vscode-ontology-driven-development
npm ci
npm run build
node packages/cli/bin/oont.js --help
```

以下の例の `oont` は `node <クローンした場所>/packages/cli/bin/oont.js` のことです。シェルのエイリアスを作っておくと、例をそのまま実行できます。

```sh
alias oont="node $PWD/packages/cli/bin/oont.js"
```

## コマンド

```text
oont validate <path>... [--format text|json] [--strict]
oont export tools   <file> [-o <out>]
oont export summary <file> [-o <out>]
oont export turtle  <file> [-o <out>]
oont --help
oont --version
```

| コマンド | すること |
| --- | --- |
| `validate` | ファイルやディレクトリを検証し、診断を表示します。 |
| `export tools` | アクション型を AI エージェント用のツール定義（JSON Schema）として書き出します。**ODD: アクションを AI エージェント用ツール定義 (JSON Schema) としてエクスポート...** と同じ内容です。 |
| `export summary` | LLM のコンテキストに入れる Markdown の要約を書き出します。**ODD: LLM コンテキスト用のオントロジー要約をエクスポート...** と同じ内容です。 |
| `export turtle` | RDF に変換したモデルを Turtle で書き出します。**ODD: Object Ontology を Turtle (OWL) としてエクスポート...** と同じ内容です。 |
| `--help`、`-h` | 使い方を表示します。 |
| `--version`、`-v` | CLI の版を表示します。 |

## `oont validate`

### オプション

| オプション | 既定 | 意味 |
| --- | --- | --- |
| `--format text` | 既定 | 診断を1行ずつ表示し、最後に集計を1行表示します。 |
| `--format json` | | JSON のレポートを標準出力に書きます。 |
| `--strict` | オフ | 警告も失敗として扱います（終了コード 1）。 |

### 検証するファイル

- `<path>` にはファイルかディレクトリを指定します。複数指定できます。
- **ディレクトリ**を指定すると、その下を再帰的に探して `*.oont.yaml`、`*.oont.yml`、`*.oont.json` を検証します。`node_modules` と、名前が `.` で始まるディレクトリは探しません。名前が違うファイルは、先頭が `objectOntology:` でも対象になりません。
- **コマンドラインで直接指定したファイル**は、名前が `*.oont.*` か、最初のキーが `objectOntology` なら検証します（拡張機能が無題のドキュメントを判定するときと同じ規則です）。それ以外のファイルは使い方の誤りとして、終了コード 2 になります。
- ワイルドカードはシェルが展開します。`oont` 自身は展開しません。
- カレントディレクトリの下にあるファイルは相対パスで、それ以外は絶対パスで表示します。

### text 形式の出力

診断は1件1行で、`パス:行:列: 重大度: メッセージ [コード]` の形です。行と列は 1 から数えるので、VS Code のターミナルではクリックして該当箇所に移動できます。コードのない診断には `[...]` が付きません。最後の行は、検証したファイル数とエラー・警告の件数です。このページの例では、[ODD チュートリアル](../odd/tutorial-requirements-to-ontology.md)のファイルの参照を1か所打ち間違えた（`REQ-04`）ものを使っています。

```text
$ oont validate room-booking.oont.yaml
room-booking.oont.yaml:85:20: error: Requirement "REQ-04" is not defined in requirements. [requirement-undefined]
room-booking.oont.yaml:10:3: warning: Requirement "REQ-005" is not referenced by any element. [requirement-unreferenced]
room-booking.oont.yaml:11:3: warning: Requirement "REQ-006" is not referenced by any element. [requirement-unreferenced]
1 file checked: 1 error, 2 warnings
```

問題がなければ集計の行だけが出ます。

```text
$ oont validate packages/vscode/samples examples
7 files checked: 0 errors, 0 warnings
```

診断のメッセージは英語です。

### json 形式の出力

`--format json` を付けると、レポートを1つ出力します。`code` は診断にコードがあるときだけ入ります。`range` は開始と終了の位置で、行と列は 1 から数えます。

```text
$ oont validate room-booking.oont.yaml --format json
```

```json
{
  "files": [
    {
      "path": "room-booking.oont.yaml",
      "diagnostics": [
        {
          "severity": "error",
          "code": "requirement-undefined",
          "message": "Requirement \"REQ-04\" is not defined in requirements.",
          "range": {
            "start": {
              "line": 85,
              "column": 20
            },
            "end": {
              "line": 85,
              "column": 26
            }
          }
        },
        {
          "severity": "warning",
          "code": "requirement-unreferenced",
          "message": "Requirement \"REQ-005\" is not referenced by any element.",
          "range": {
            "start": {
              "line": 10,
              "column": 3
            },
            "end": {
              "line": 10,
              "column": 10
            }
          }
        },
        {
          "severity": "warning",
          "code": "requirement-unreferenced",
          "message": "Requirement \"REQ-006\" is not referenced by any element.",
          "range": {
            "start": {
              "line": 11,
              "column": 3
            },
            "end": {
              "line": 11,
              "column": 10
            }
          }
        }
      ]
    }
  ],
  "summary": {
    "files": 1,
    "errors": 1,
    "warnings": 2
  }
}
```

診断のコードの一覧は[形式リファレンス](object-ontology-format.md#要件の診断)にあります。

## `oont export`

```sh
oont export summary room-booking.oont.yaml            # 標準出力へ
oont export tools room-booking.oont.yaml -o tools.json
```

- 種類（`tools`、`summary`、`turtle`）のあとに、ファイルを1つだけ指定します。
- `-o` がなければ標準出力に書きます。`-o <out>` を付けるとそのファイル（カレントディレクトリからの相対パス）に書き、既存のファイルは上書きします。
- 出力は、拡張機能の同名のエクスポートとまったく同じです。たとえば `examples/claude-code/object-ontology-mcp/delivery/` の配送サンプルに `oont export tools` を実行すると、同梱の `delivery-ops.tools.json` と1バイトも違わない出力になります。
- 診断は標準エラーに書きます。**ファイルにエラーがあると何も出力せず**、終了コード 1 で終わります。警告だけならエクスポートします。

```text
$ oont export summary room-booking.oont.yaml
room-booking.oont.yaml:85:20: error: Requirement "REQ-04" is not defined in requirements. [requirement-undefined]
room-booking.oont.yaml:10:3: warning: Requirement "REQ-005" is not referenced by any element. [requirement-unreferenced]
room-booking.oont.yaml:11:3: warning: Requirement "REQ-006" is not referenced by any element. [requirement-unreferenced]
```

`export` はファイル名を確かめません。Object Ontology ではないファイルを指定すると、終了コード 2 ではなく、診断を表示して終了コード 1 になります。

```text
$ oont export summary notes.yaml
notes.yaml:1:1: warning: Unknown field "a" in the document. Expected one of: objectOntology, name, description, namespace, objectTypes, interfaces, linkTypes, actionTypes, objects, requirements.
notes.yaml:1:1: error: Missing `objectOntology: 1` — the format version marker.
```

要約の出力例は [ODD チュートリアル](../odd/tutorial-requirements-to-ontology.md#7-cli-で確かめる)にあります。

## 終了コード

| コード | 意味 |
| --- | --- |
| 0 | エラーなし。`--strict` のときは警告もなし。 |
| 1 | `validate`：エラーがある（`--strict` のときはエラーか警告がある）。`export`：ファイルにエラーがあり、何も出力していない。 |
| 2 | コマンドを実行できなかった。使い方の誤り（未知のコマンド・オプション・形式・エクスポートの種類、引数の不足）、ファイルの読み書きができない、直接指定したファイルが Object Ontology ではない、指定したパスに Object Ontology のファイルが1つもない。 |

終了コード 2 のときは、理由と使い方を標準エラーに表示します。

```text
$ oont validate notes.yaml
oont: notes.yaml is not an Object Ontology file (expected *.oont.yaml|yml|json or a first key objectOntology).

Usage:
  oont validate <path>... [--format text|json] [--strict]
  ...
```

終了コード 2 で出るほかのメッセージの例です。

```text
oont: Cannot read missing.oont.yaml: no such file or directory.
oont: No Object Ontology files (*.oont.yaml, *.oont.yml, *.oont.json) found in empty.
oont: Unknown format "xml". Use text or json.
oont: Unknown export "room-booking.oont.yaml". Use tools, summary or turtle.
oont: Unknown command "frobnicate".
```

## CI で使う

オントロジーを置いたフォルダーに `oont validate` を実行します。終了コードが 0 以外ならジョブが失敗します。参照されていない要件などの警告でもマージを止めたいときは、`--strict` を付けます。

npm に公開されるまでは、GitHub Actions のジョブでこのリポジトリから CLI をビルドできます。

```yaml
name: Ontology
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Build oont
        run: |
          git clone --depth 1 https://github.com/yaggytter/vscode-ontology-driven-development.git "$RUNNER_TEMP/odd"
          cd "$RUNNER_TEMP/odd" && npm ci && npm run build
      - name: Validate ontologies
        run: node "$RUNNER_TEMP/odd/packages/cli/bin/oont.js" validate docs/ontology --strict
```

`docs/ontology` は自分のパスに置き換えてください。エクスポートした結果をオントロジーと揃えておきたいときは、CI で作り直して差分があれば失敗させます。

```sh
oont export tools docs/ontology/room-booking.oont.yaml -o agent/tools.json
git diff --exit-code agent/tools.json
```

結果を別のツールで読むときは `--format json` を使い、`summary.errors` と `summary.warnings` を見てください。

## AI エージェントから使う

text 形式はエージェントにも読みやすく、終了コードでオントロジーが正しいかどうかが分かります。`CLAUDE.md` などに、たとえば次のように書いておきます。

```text
*.oont.yaml を編集したら `oont validate <ファイル>` を実行し、エラーをすべて直してから次に進むこと。
```

オントロジーをエージェントのコンテキストに渡したり、アクションをツールとして提供したりするときは、`oont export summary` と `oont export tools` を使います。[チュートリアル6](../ai/tutorial-6-object-ontology-ai-agents.md)と[チュートリアル8](../ai/tutorial-8-claude-code-object-ontology.md)をご覧ください。

## 関連ページ

- [Object Ontology 形式リファレンス](object-ontology-format.md)
- [チュートリアル：要件からオントロジーを作る](../odd/tutorial-requirements-to-ontology.md)
- [トラブルシューティング](troubleshooting.md#cli-oont)
