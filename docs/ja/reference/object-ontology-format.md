# Object Ontology 形式リファレンス

Object Ontology のファイル（`*.oont.yaml`）に書けることを、このページにまとめます。各セクションとそこに書けるフィールド、要件 ID、`x-` 拡張フィールド、ツールが出す診断を扱います。順を追って学ぶなら[はじめての Object Ontology](../learn/tutorial-5-object-ontology.md)から、オントロジー駆動開発の進め方は[オントロジー駆動開発とは](../odd/what-is-odd.md)をご覧ください。

VS Code 拡張機能と [`oont` CLI](cli.md) は同じコアライブラリを使っているので、ここに書いた規則はどちらにも当てはまります。

## ファイル

| 項目 | 規則 |
| --- | --- |
| ファイル名 | `*.oont.yaml`、`*.oont.yml`（YAML）、`*.oont.json`（JSON）。ふつうの `.yaml` や `.json` は Object Ontology として扱いません。 |
| 無題のドキュメント | 最初のキーが `objectOntology` の YAML・JSON も認識します。**ODD: サンプルオントロジーを作成...** で開いたサンプルが、保存前でも扱えるのはこのためです。 |
| 版 | `objectOntology: 1`。要件 ID と `x-` フィールドは版 1 への任意の追加なので、それ以前に書いたファイルもそのまま読めます。 |
| 名前 | API 名（オブジェクト型、プロパティ、リンク型、リンクの端、インターフェース、アクション型、パラメーターの YAML キー）は `^[A-Za-z][A-Za-z0-9_]*$` に一致させます。`-` を含められないので、`x-` フィールドと衝突しません。 |
| 編集 | 編集には YAML を使います。図からの編集は YAML に書き戻され、コメントも残ります。JSON ファイルは図では表示だけです。 |

## トップレベルのフィールド

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `objectOntology` | `1` | はい | 形式の版。1 以外はエラーです。 |
| `name` | 文字列 | いいえ | オントロジーの名前。エクスポートに使います。 |
| `description` | 文字列 | いいえ | 何を扱うオントロジーか。 |
| `namespace` | 文字列 | いいえ | RDF に変換するときの IRI。末尾は `#`、`/`、`:` のいずれか。省略すると、`name` から作った文字列で `urn:object-ontology:<slug>#` を使います。 |
| `requirements` | マッピング | いいえ | 要件台帳（要件 ID → 見出し）。[要件](#要件)を参照。 |
| `objectTypes` | マッピング | いいえ | オブジェクト型。キーは API 名。 |
| `interfaces` | マッピング | いいえ | インターフェース。キーは API 名。 |
| `linkTypes` | マッピング | いいえ | リンク型。キーは API 名。 |
| `actionTypes` | マッピング | いいえ | アクション型。キーは API 名。 |
| `objects` | マッピング | いいえ | サンプルオブジェクト。キーはオブジェクト型。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。[`x-` 拡張フィールド](#x--拡張フィールド)を参照。 |

未知のフィールド（`x-*` 以外）は警告になり、その場所に書けるフィールドの一覧が表示されます。ファイルの読み込みは続きます。

## オブジェクト型

```yaml
objectTypes:
  Room:
    displayName: 会議室
    description: 予約できる会議室。
    requirements: [REQ-003, REQ-007]
    primaryKey: roomId
    titleProperty: name
    properties:
      roomId: string
      name: string
      capacity: { type: integer, description: 入れる人数の上限 }
      status: { type: string, enum: [active, suspended] }
```

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `primaryKey` | API 名 | はい | オブジェクトを識別するプロパティ。`properties` のどれかを指定します。 |
| `titleProperty` | API 名 | いいえ | オブジェクトの見出しにするプロパティ。`properties` のどれかを指定します。 |
| `displayName` | 文字列 | いいえ | 表示名。図で名前を変えるとこのフィールドが書き換わり、API 名は変わりません。 |
| `pluralDisplayName` | 文字列 | いいえ | 表示名の複数形。 |
| `description` | 文字列 | いいえ | 業務上の意味。 |
| `icon` | 文字列 | いいえ | 図に表示する短いアイコン（絵文字など8文字まで）。 |
| `color` | 文字列 | いいえ | 図の色。`#3a7bd5` のような16進数。それ以外は警告です。 |
| `implements` | API 名のリスト | いいえ | 実装するインターフェース。インターフェースのプロパティをすべて持つ必要があります。 |
| `properties` | マッピング | いいえ | プロパティ。キーは API 名。[プロパティ](#プロパティ)を参照。 |
| `requirements` | ID のリスト | いいえ | この型が実現する要件。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。 |

## プロパティ

プロパティは、型名だけを書く省略形か、マッピングで書きます。

```yaml
properties:
  roomId: string                                # 省略形
  tags: string[]                                # 省略形（リスト）
  capacity: { type: integer, unit: people }     # マッピング
```

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `type` | 文字列 | はい | `string`、`integer`、`decimal`、`double`、`boolean`、`date`、`timestamp`、`geopoint` のいずれか。リストにするときは `string[]` のように `[]` を付けます。 |
| `displayName` | 文字列 | いいえ | 表示名。 |
| `description` | 文字列 | いいえ | プロパティの意味。 |
| `unit` | 文字列 | いいえ | 単位（`JPY`、`minutes` など）。 |
| `enum` | リスト | いいえ | 取りうる値。意味があるのは `string` だけで、それ以外の型では警告になります。 |
| `required` | 真偽値 | いいえ | すべてのオブジェクトが値を持つべきか。 |
| `x-*` | 任意 | いいえ | 拡張フィールド（マッピングで書いたときだけ）。 |

## インターフェース

インターフェースは、複数のオブジェクト型が共通して持つプロパティの組です。

```yaml
interfaces:
  Trackable:
    displayName: 位置を追跡できるもの
    properties:
      lastSeenAt: timestamp
objectTypes:
  Vehicle:
    implements: [Trackable]
    # ... Vehicle 側にも lastSeenAt が必要
```

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `displayName` | 文字列 | いいえ | 表示名。 |
| `description` | 文字列 | いいえ | インターフェースの意味。 |
| `extends` | API 名のリスト | いいえ | 継承するインターフェース。 |
| `properties` | マッピング | いいえ | プロパティ。書き方はオブジェクト型と同じです。 |
| `requirements` | ID のリスト | いいえ | このインターフェースが実現する要件。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。 |

インターフェースとオブジェクト型に同じ名前は付けられません。

## リンク型

リンク型は、2つの端を持つ名前付きの関係です。

```yaml
linkTypes:
  bookingRoom:
    displayName: 予約した会議室
    from: { objectType: Booking, name: room, cardinality: one }
    to: { objectType: Room, name: bookings, cardinality: many }
```

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `from` | 端 | はい | リンクの起点側。 |
| `to` | 端 | はい | もう一方の端。 |
| `displayName` | 文字列 | いいえ | 表示名。 |
| `description` | 文字列 | いいえ | リンクの意味。 |
| `foreignKey` | `型.プロパティ` | いいえ | リンクを保持するプロパティ。2つのオブジェクト型のどちらかのプロパティを `Shipment.vehicleId` のように書きます。 |
| `requirements` | ID のリスト | いいえ | このリンクが実現する要件。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。 |

端（`from` と `to`）には次のフィールドを書きます。

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `objectType` | API 名 | はい | この端のオブジェクト型。 |
| `name` | API 名 | はい | この端のオブジェクト型から見たリンクの名前。その型のプロパティ名や他のリンク名と重なってはいけません。 |
| `cardinality` | `one` または `many` | いいえ | この端にいくつのオブジェクトが入るか。既定は `many`。 |
| `displayName` | 文字列 | いいえ | この端の表示名。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。 |

上の例では、予約（Booking）ごとに会議室（`room`）が1つ、会議室ごとに予約（`bookings`）が複数あります。図では **N:1** のバッジで表示されます。

## アクション型

アクション型は、パラメーターを取る名前付きの変更操作です。データを変える手段として定義されるのはアクションだけで、AI エージェント向けのツール定義の元にもなります。

```yaml
actionTypes:
  cancelBooking:
    displayName: 予約を取り消す
    description: 予約した本人が、開始前に予約を取り消す。
    requirements: [REQ-004]
    parameters:
      booking: { type: objectRef, objectType: Booking, required: true }
      requestedBy: { type: objectRef, objectType: Member, required: true }
    rules:
      - { op: modifyObject, objectType: Booking, object: booking, set: { status: cancelled } }
    validations:
      - description: 取り消せるのは予約した本人だけ
        requirements: [REQ-004]
        expr: "booking.organizer == requestedBy"
    sideEffects:
      - 参加者に通知する
```

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `displayName` | 文字列 | いいえ | 表示名。 |
| `description` | 文字列 | いいえ | 何をするアクションか、どんなときに使ってはいけないか。AI エージェントが読みます。 |
| `parameters` | マッピング | いいえ | 入力。キーは API 名。 |
| `rules` | リスト | いいえ | アクションが行う変更。 |
| `validations` | リスト | いいえ | 満たさなければアクションを拒否する条件。 |
| `sideEffects` | 文字列のリスト | いいえ | 通知など、オントロジーの外で起きること。 |
| `requirements` | ID のリスト | いいえ | このアクションが実現する要件。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。 |

### パラメーター

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `type` | 文字列 | はい | プロパティの型（`string`、`integer` など）か `objectRef`。リストにするときは `[]` を付けます。 |
| `objectType` | API 名 | `objectRef` のとき | `objectRef` が指すオブジェクト型。エクスポートしたツールでは、エージェントはその型の主キーを渡します。 |
| `required` | 真偽値 | いいえ | 必須の入力か。 |
| `displayName` | 文字列 | いいえ | 表示名。 |
| `description` | 文字列 | いいえ | パラメーターの意味。 |
| `enum` | リスト | いいえ | 取りうる値。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。 |

### ルール

| フィールド | 使う操作 | 意味 |
| --- | --- | --- |
| `op` | すべて | `createObject`、`modifyObject`、`deleteObject`、`createLink`、`deleteLink` のいずれか。 |
| `objectType` | オブジェクトの操作 | 作成・変更・削除するオブジェクト型。 |
| `object` | `modifyObject`、`deleteObject` | 対象のオブジェクトを指すパラメーター。 |
| `linkType` | リンクの操作 | 作成・削除するリンク型。 |
| `from`、`to` | リンクの操作 | 両端を指すパラメーター。 |
| `set` | `createObject`、`modifyObject` | `プロパティ: 値`。`$startsAt` のように `$` で始まる値はパラメーター、それ以外はそのままの値です。 |
| `x-*` | すべて | 拡張フィールド。 |

ルールが参照するパラメーター、オブジェクト型、リンク型、プロパティが存在するかは、ツールが確かめます。

### validation

validation は文字列かマッピングで書きます。

```yaml
validations:
  - 利用中の会議室だけを予約できる                  # 文字列形式
  - description: 参加人数が定員以下であること       # マッピング形式
    requirements: [REQ-003]
    expr: "attendees <= room.capacity"
```

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `description` | 文字列 | はい | ふつうの言葉で書いた条件。エージェントとレビューする人はここを読みます。 |
| `expr` | 文字列 | いいえ | 同じ条件を式で書いたもの。人と AI エージェント向けの説明で、ツールは**評価しません**。 |
| `requirements` | ID のリスト | いいえ | この validation が実現する要件。アクションの要件とは別に数え、アクションから引き継ぎません。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。 |

文字列形式には `requirements` も `x-` フィールドも書けません。必要なときはマッピング形式にしてください。

## サンプルオブジェクト

`objects:` には、オブジェクト型ごとにいくつかの例を書きます。図、SPARQL、LLM 向けの要約に使われます。実データではありません。

```yaml
objects:
  Room:
    - { roomId: R-A, name: Room A, capacity: 4, status: active }
  Booking:
    - { bookingId: B-1003, attendees: 5, status: reserved, room: R-A, organizer: U-02 }
```

- キーはプロパティの API 名とリンクの端の名前です。リンクのフィールドには、相手のオブジェクトの主キー（またはそのリスト）を書きます。
- 各オブジェクトに主キーが必要で、同じ型の中で重複してはいけません。
- サンプルオブジェクトには `x-` フィールドを書けません。

## 要件

要件 ID を使うと、オントロジーの各要素がどの要件から来たかをたどれます。トップレベルの**台帳**と、各要素からの**参照**の2つで書きます。

### 台帳

```yaml
requirements:
  REQ-001: { title: 社員は会議室を時間指定で予約できる, source: docs/requirements.md }
  REQ-002: 同じ会議室で時間帯が重なる予約はできない   # 省略形：文字列が見出しになる
```

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `title` | 文字列 | はい | 短い見出し。要件の本文は要件ドキュメントに書き、台帳には書きません。 |
| `description` | 文字列 | いいえ | 補足。 |
| `source` | 文字列 | いいえ | 要件の本文がある場所。URL か、オントロジーのファイルからの相対パス。 |
| `x-*` | 任意 | いいえ | 拡張フィールド。 |

- 値が文字列のときは `{ title: <文字列> }` と同じ意味です。
- ID は `^[A-Za-z][A-Za-z0-9_.-]*$` に一致し、64文字以内とします。API 名と違って `-` と `.` を使えるので、`REQ-001` も `US-12.3` も書けます。
- 台帳の順序に意味はありませんが、LLM 向けの要約などの出力では書いた順を保ちます。
- 空の台帳（`requirements: {}`）も台帳として扱います。この場合、参照はすべて未定義になります。

### 参照

次の場所に `requirements: [ID, ...]` を書けます。

| 書ける場所 | 例 |
| --- | --- |
| `objectTypes.<型>` | `Room: { requirements: [REQ-003, REQ-007], ... }` |
| `interfaces.<名前>` | |
| `linkTypes.<名前>` | |
| `actionTypes.<名前>` | `reserveRoom: { requirements: [REQ-001, REQ-002], ... }` |
| `actionTypes.<名前>.validations[]`（マッピング形式） | `- { description: ..., requirements: [REQ-002] }` |

参照は「この要素が、この要件（の一部）を実現する」という意味です。プロパティ、パラメーター、ルール、リンクの端には書けません。

### 要件が表示される場所

| 場所 | 表示されるもの |
| --- | --- |
| 「問題」パネル・`oont validate` | 次の節の診断。 |
| Inspector | 選んだオブジェクト型やリンクに**要件**の欄が出て、`ID 見出し` が並びます。 |
| アクションパネル | アクションごとに**要件**の欄が出ます。validation には自分の ID が角かっこで付きます。 |
| SPARQL | サンプルクエリ **9. 要件と、それを実現する要素**。RDF では要件が `oont:Requirement` になり、要素から `oont:satisfies` で参照されます。 |
| LLM 向けの要約 | 各要素の下に `Requirements:` の行、末尾に要件ごとの実現要素を並べた `## Requirements` 節。 |
| エージェント用のツール定義 | 変わりません。要件 ID はツールに書き込みません。 |

## 要件の診断

次の診断にはコードが付きます。CLI ではメッセージの末尾に角かっこで、JSON 出力では `code` に入ります。メッセージは拡張機能でも CLI でも英語です。

| コード | 重大度 | 出る条件 | メッセージの例 |
| --- | --- | --- | --- |
| `requirement-undefined` | エラー | 台帳があり、参照した ID が台帳にない | `Requirement "REQ-010" is not defined in requirements.` |
| `requirement-registry-missing` | 警告 | 参照があるのに台帳がない。最初の参照に1回だけ出ます | `Requirement IDs are not checked because there is no top-level requirements registry.` |
| `requirement-unreferenced` | 警告 | 台帳の要件を、どの要素も参照していない | `Requirement "REQ-008" is not referenced by any element.` |
| `requirement-duplicate-reference` | 警告 | 1つの参照リストに同じ ID が2回以上ある。モデルには1つだけ残ります | `Requirement "REQ-001" is listed more than once.` |
| `requirement-id-invalid` | エラー | ID が規則に合わない。同じ ID に `requirement-undefined` は重ねて出しません | `Invalid requirement ID "REQ 2". Use letters, digits, "_", "-" or ".", starting with a letter.` |
| `requirement-title-missing` | エラー | マッピング形式の台帳項目に `title` がない | `Requirement "REQ-001" needs a title.` |

参照切れ、未知のフィールド、サンプルオブジェクトのキー重複など、ほかの診断にはコードがありません。

## `x-` 拡張フィールド

`x-` で始まるキーは拡張フィールドです。知らないツールは無視するので、後の工程や自作ツールのためのメモを、何も壊さずに書いておけます。

```yaml
Booking:
  x-retention: 取消・解放した予約は1年間残す
releaseNoShow:
  x-trigger: { kind: schedule, every: 1m }
```

- キーは `^x-[A-Za-z0-9][A-Za-z0-9_.-]*$` に一致させます。値はスカラー、リスト、マッピングのどれでも構いません。
- 決まったフィールドを持つマッピングならどこにでも書けます。トップレベル、オブジェクト型、インターフェース、リンク型、リンクの端（`from`・`to`）、プロパティ（マッピング形式）、アクション型、パラメーター、ルール、validation（マッピング形式）、台帳の項目（マッピング形式）です。
- `objectTypes:` や `properties:` のように名前を並べるマッピングのキーには使えません。`objects:` にも書けません。
- 診断は出ず、図から編集しても消えません。要約、ツール定義、RDF には出力しません。
- 使ってみて役に立った `x-` フィールドは、正式なフィールドとして提案してください。

## JSON Schema

形式の全体は JSON Schema [`packages/core/schemas/object-ontology.schema.json`](../../../packages/core/schemas/object-ontology.schema.json) で定義しています。拡張機能は `*.oont.json` に自動で適用し、Red Hat の YAML 拡張機能を入れていれば `*.oont.yaml` にも適用するので、入力中に補完が効きます。このスキーマは `requirements` と `x-` フィールドを受け付けますが、古いスキーマを使っているエディタではエラーになります。
