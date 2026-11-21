# はじめに

拡張機能をインストールしてから、要件とつながったオントロジーを開き、`oont` CLI で検証するところまでを案内します。考え方は[オントロジー駆動開発とは](odd/what-is-odd.md)で説明しています。

## インストール

VS Code Marketplace から **Ontology-Driven Development** をインストールします（`.vsix` ファイルを直接渡された場合はそちらから）。

## ステップ1：会議室予約のサンプルを開く

コマンドパレット（`Cmd+Shift+P` / `Ctrl+Shift+P`）から **ODD: サンプルオントロジーを作成...** を実行し、**会議室予約（Object Ontology）** を選びます。

サンプルは無題の YAML ドキュメントとして開きます。小さな会議室予約システムを Object Ontology で書いたものです。トップレベルの `requirements:`（要件台帳）に7つの要件（`REQ-001`〜`REQ-007`）が並び、すべてのオブジェクト型・リンク・アクションに、実現する要件の ID が書いてあります。

```yaml
requirements:
  REQ-001: { title: 会議室を時間指定で予約できる, source: docs/requirements.md }
  REQ-002: 同じ会議室で時間帯が重なる予約はできない
  # ...
objectTypes:
  Room:
    displayName: Meeting room
    requirements: [REQ-003, REQ-007]
```

好きなフォルダーに `room-booking.oont.yaml` という名前で保存してください。拡張子が `.oont.yaml` だと、拡張機能と CLI がこのファイルを Object Ontology として扱います。

## ステップ2：図で要件を見る

ファイルにフォーカスがある状態で、macOS では `Cmd+Alt+O`、Windows/Linux では `Ctrl+Alt+O` を押します。エディタ右上の図のアイコンや、コマンドパレットの **ODD: 図でプレビューを開く** からも開けます。

- **Meeting room** か **Booking** をクリックします。右側の Inspector に、プロパティとリンクに加えて**要件**の欄が表示され、要件の ID と見出しが並びます（Member はどの要件も参照していないので、この欄は出ません）。
- ツールバーの**アクション**をクリックし、**Reserve room** を選びます。パラメーター、変更内容、**実行条件（満たさない場合は拒否）**が表示され、各条件の後ろにはその条件が守る要件の ID が付きます。最後に**要件**の欄が続きます。
- **SPARQL** をクリックし、サンプルから **9. 要件と、それを実現する要素** を選んで実行すると、要件ごとに実現している要素が一覧できます。

## ステップ3：「問題」パネルに抜けを見つけさせる

「問題」パネル（`Cmd+Shift+M` / `Ctrl+Shift+M`）を開きます。サンプルには問題がないので、何も表示されていません。

まだどの要素も実現していない要件を足してみます。台帳の `REQ-007` の下に、次の1行を加えてください。

```yaml
  REQ-008: 予約の一覧を CSV で出力できる
```

`REQ-008` に警告 `Requirement "REQ-008" is not referenced by any element.` が出ます。台帳の要件は、少なくとも1つのオブジェクト型・リンク・アクション・validation に実現されているべきだからです。要素の `requirements:` に `REQ-08` のような打ち間違いがあれば、エラーになります。要件の診断の一覧は[形式リファレンス](reference/object-ontology-format.md#要件の診断)にあります。

ファイルを保存し、足した行は次のステップのために残しておきます。

## ステップ4：CLI で検証する

同じ検査を、ターミナル、CI、AI エージェントから `oont` CLI で実行できます。npm には `@yaggytter/object-ontology-cli` として公開する予定です。それまでは、このリポジトリをクローンして実行してください（Node.js 20 以上）。

```sh
git clone https://github.com/yaggytter/vscode-ontology-driven-development.git
cd vscode-ontology-driven-development
npm ci && npm run build
alias oont="node $PWD/packages/cli/bin/oont.js"
```

サンプルを保存したフォルダーで、次のように実行します。

```text
$ oont validate room-booking.oont.yaml
room-booking.oont.yaml:16:3: warning: Requirement "REQ-008" is not referenced by any element. [requirement-unreferenced]
1 file checked: 0 errors, 1 warning
```

警告だけなら失敗にならないので、終了コードは 0 です。`--strict` を付けると警告も失敗として扱います（終了コード 1）。`REQ-008` の行を消せば、問題はなくなります。

```text
$ oont validate room-booking.oont.yaml
1 file checked: 0 errors, 0 warnings
```

`oont export summary room-booking.oont.yaml` を実行すると、AI エージェントにコンテキストとして渡せる Markdown の要約が出力されます。コマンドとオプションの一覧は [CLI リファレンス](reference/cli.md)にあります。

## 次は自分で作ってみる

[チュートリアル：要件からオントロジーを作る](odd/tutorial-requirements-to-ontology.md)で、要件を書くところから、このオントロジーを順に作っていきます。

## ほかのサンプル

**ODD: サンプルオントロジーを作成...** には、2つの方式のオントロジーのサンプルがほかにもあります。

| サンプル | 内容 |
| --- | --- |
| 会議室予約（Object Ontology） | すべての要素から要件 ID をたどれる。`x-` 拡張フィールドの例 |
| 街角カフェの注文（Object Ontology） | 入門用の Object Ontology。オブジェクト型、リンク、アクション |
| 配送オペレーション（Object Ontology） | 荷物の遅延対応で、アクションを AI エージェントのツールとして使う |
| 工場保全（Object Ontology） | センサーの警報からリンクをたどって作業指示を起票する |
| サポートデスク（Object Ontology） | 検証ルールを、エージェントが行う返金のガードレールにする |
| まちの共同菜園 | 小規模なクラス階層、逆関係、インスタンス |
| 道具の貸し借り | 逆関係、対称関係、推移関係、関数的プロパティ |
| フィールド調査ノート | カタログ型レコードと型付きリテラル |
| 地域サービス | OWL クラスの代わりに SKOS で組んだ概念体系 |
| 港の朝市 | アイコン、色、カーディナリティ、関係属性 |
| 都市モビリティ拠点 | 複数領域をつなぐ中規模の運用オントロジー |
| 地域イベント（RDF/XML） | オリジナルの表示専用サンプルと「Turtle に変換」の流れ |
| 自転車パーツの互換性 | LLM が推測せずに問い合わせて答えられる OWL の事実（GraphRAG） |
| 物流用語集（英日） | 検索語の展開と用語の正規化に使う、英日 2 言語の SKOS 用語集 |
| 来歴付きデータカタログ | 数値の出どころを示して答えるための DCAT + PROV-O |
| 研究知識グラフ | `sameAs` で組織をまたいで統合した schema.org のエンティティ |
| 配送オペレーション（OWL） | 配送サンプルを OWL で書いたもの。2つのスタイルの比較用 |

お手持ちの `.ttl` ファイルを開くだけでも構いません。特別な準備は不要です。Object Ontology のファイルは拡張子を `.oont.yaml` にしてください。詳しくは[はじめての Object Ontology](learn/tutorial-5-object-ontology.md)で説明しています。

## 図の基本操作を試す

図はファイルの隣に**スキーマビュー**（既定）で開きます。クラスやオブジェクト型ごとに1ノード、関係ごとに1エッジで表示し、データ型プロパティは独立したノードにせず各ノードに折りたたみます。RDF のファイルでは、ツールバーの **Schema / Triples** 切替で生のトリプルグラフ（主語・述語・目的語をすべてノードにした表示）に切り替えられます。ファイルの中身を正確に確認したいときに便利です。

> **なぜ `Cmd+Shift+O` ではないのか？** それは VS Code 標準の「エディター内のシンボルへ移動」で、大きなファイルほど便利な機能だからです。この拡張機能はあえてこのキーを奪いません。

**まちの共同菜園**などの Turtle のサンプルを開いて、次を試してください。

1. **ノードをドラッグ**します。位置は次回この図を開いたときも記憶されています。
2. **ノードをクリック**します。右側に Inspector が開き、名前・説明・プロパティ・関係が表示されます（点線の枠があるノードだけ編集できます）。
   凡例には同系色の意味が、選択したエンティティには接続グループが表示されます。
3. **Inspector の名前欄を編集**します。新しい値を入力して Enter を押すかフォーカスを外すと、`.ttl` ファイルが更新されます。同じパネルの「+ Property」ボタンでプロパティを追加したり、ドロップダウンから既存プロパティの型を変えたりできます。
4. **ノードをダブルクリック**するとフォーカスモードに入り、そのノードの周辺以外が減光されます。背景をクリックすると解除されます。
5. **わざと壊してみます。** エディタに不正な Turtle を入力しても、図は直前の正常な状態を表示し続け、エラー箇所には波線が表示されます。

## 次のステップ

**オントロジー駆動開発**

- [オントロジー駆動開発とは](odd/what-is-odd.md)
- [チュートリアル：要件からオントロジーを作る](odd/tutorial-requirements-to-ontology.md)

**オントロジーを理解する**

- [チュートリアル1: 最初のオントロジーを作る](learn/tutorial-1-first-ontology.md)
- [チュートリアル2: 図から編集する](learn/tutorial-2-editing-from-diagram.md)
- [チュートリアル3: 既存の .owl ファイルを取り込む](learn/tutorial-3-importing-owl.md)
- [チュートリアル4: SPARQL で問い合わせる](learn/tutorial-4-sparql.md)
- [チュートリアル5: はじめての Object Ontology](learn/tutorial-5-object-ontology.md)
- [オントロジー方式の選び方](learn/choosing-ontology-style.md)・[ユースケース集](learn/use-cases.md)

**AI と組み合わせる**

- [チュートリアル6: Object Ontology × AI エージェント](ai/tutorial-6-object-ontology-ai-agents.md)
- [チュートリアル7: Semantic Web オントロジー × LLM](ai/tutorial-7-semantic-web-llm.md)
- [チュートリアル8: Claude Code で動かす — Object Ontology とエージェント](ai/tutorial-8-claude-code-object-ontology.md)
- [チュートリアル9: Claude Code で動かす — Semantic Web と根拠のある回答](ai/tutorial-9-claude-code-semantic-web.md)

**リファレンス**

- [Object Ontology 形式](reference/object-ontology-format.md)
- [CLI（`oont`）](reference/cli.md)
- [対応形式](reference/format-support.md)
- [トラブルシューティング](reference/troubleshooting.md)
