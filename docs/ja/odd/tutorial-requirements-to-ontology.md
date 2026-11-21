# チュートリアル：要件からオントロジーを作る

小さな会議室予約システムを題材に、[オントロジー駆動開発](what-is-odd.md)の1周を体験します。要件に ID を振り、Object Ontology に落とし込み、各要素に実現する要件を書き、足りないものをツールに指摘させ、図でレビューし、`oont` CLI で検証します。

所要時間は30分ほどです。この拡張機能を入れた VS Code を用意してください。手順7では CLI も使います。まだ npm に公開していないので、[CLI リファレンス](../reference/cli.md#インストール)の手順でこのリポジトリから実行します。

できあがるオントロジーは、同梱のサンプル **会議室予約（Object Ontology）** に近いものです。**ODD: サンプルオントロジーを作成...** でいつでも開いて見比べられます。

## 0. フォルダーを用意する

`room-booking` というフォルダーを作り、VS Code で開きます。この中に2つのファイルを作ります。

| ファイル | 中身 |
| --- | --- |
| `requirements.md` | ID を振った要件の一覧 |
| `room-booking.oont.yaml` | オントロジー。拡張子が `.oont.yaml` なので、拡張機能と CLI がオントロジーとして認識します |

## 1. 要件に ID を振って書く

社員30名ほどの会社に会議室が3つあり、今は共有スプレッドシートで予約しています。ダブルブッキングと、予約したのに使われない「空予約」が困りごとです。

`requirements.md` を作り、要件ごとに ID を振ります。オントロジーからは、この ID を参照します。

```markdown
# 会議室予約の要件

| ID | 要件 |
| --- | --- |
| REQ-001 | 社員は会議室を、開始時刻と終了時刻を指定して予約できる |
| REQ-002 | 同じ会議室で時間帯が重なる予約はできない |
| REQ-003 | 参加人数が会議室の定員を超える予約はできない |
| REQ-004 | 予約した本人は、開始時刻より前なら予約を取り消せる |
| REQ-005 | 利用者は開始時刻の前後15分以内にチェックインする |
| REQ-006 | 開始から15分経ってもチェックインがない予約は自動で解放され、予約者に通知される |
| REQ-007 | 総務は会議室を利用停止にできる。利用停止中の会議室は予約できない |
```

ID は、英字で始まり、英数字と `_`・`-`・`.` だけを使っていれば自由です。`REQ-001` でも `US-12.3` でも構いません。

## 2. 要件だけでは決まらない問いを立てる

YAML を書く前に要件を読み、[オントロジー駆動開発とは](what-is-odd.md#要件からオントロジーを作る)に挙げた問い（同一性、ライフサイクル、多重度、権限と条件、例外）を立てます。このシステムでは次の問いが出て、業務担当者から答えをもらいました。

| 問い | 答え | オントロジーへの影響 |
| --- | --- | --- |
| 「予約」と「利用」は別のものか | 別にしない。予約の状態（予約済み・利用中・取消・解放）で表す | オブジェクト型は `Booking` 1つにし、`status` プロパティを持たせる |
| 取消や解放のあと、予約は消すか | 消さない。空予約の分析に使う | 取消は `deleteObject` ではなく `modifyObject` のルールにする |
| 1つの予約で複数の会議室を押さえることはあるか | ない | Booking から Room へのリンクの多重度を `one` にする |
| 予約者以外の参加者を記録するか | 人数だけ記録する | 整数の `attendees` を持たせ、社員へのリンクは作らない |

答えは、要件の表の下などに書き残しておきます。オントロジーがなぜこの形なのかの根拠になります。

## 3. オブジェクト型、リンク、アクションを抜き出す

要件を読みながら、見つけたものを次のように対応させます。

| 要件の中にあるもの | 書く場所 | この例では |
| --- | --- | --- |
| モノ（名詞） | オブジェクト型 | `Member`、`Room`、`Booking` |
| モノの性質 | プロパティ | `capacity`、`startsAt`、`status` など |
| モノ同士の関係 | リンク型 | `bookingRoom`（予約は会議室を1つ押さえる）、`bookingOrganizer`（予約には予約者が1人いる） |
| 操作（動詞） | アクション型 | `reserveRoom`、`cancelBooking` など |
| ルール | validation | 「参加人数が定員以下であること」 |

たとえば REQ-001 と REQ-002 は、パラメーター、行う変更（ルール）、満たすべき条件（validation）を持つアクションになります。

```yaml
reserveRoom:
  parameters:
    room: { type: objectRef, objectType: Room, required: true }
    startsAt: { type: timestamp, required: true }
    # ...
  rules:
    - op: createObject
      objectType: Booking
      # ...
  validations:
    - description: 同じ会議室の予約済み・利用中の予約と時間帯が重ならないこと
```

小さく始めましょう。この手順では予約そのもの（REQ-001〜REQ-004 と REQ-007）だけを扱い、チェックインと空予約は後回しにします。残っていることは、ツールが教えてくれます。

## 4. 要件台帳と要件参照を書く

オントロジーと要件をつなぎます。書くものは2つです。

- **要件台帳**：トップレベルの `requirements:` に、要件 ID と短い見出しを並べます。値が文字列ならそれが見出しです。マッピングで書けば、本文の場所（`source`）なども書けます。
- **要件参照**：オブジェクト型、インターフェース、リンク型、アクション型、validation に `requirements: [ID, ...]` を書き、「この要素がこれらの要件を実現する」ことを示します。

次の内容で `room-booking.oont.yaml` を作ってください。このあとの出力に出てくる行番号は、このファイルとぴったり合います。

```yaml
objectOntology: 1
name: 会議室予約
description: ダブルブッキングと空予約をなくす会議室予約。

requirements:
  REQ-001: { title: 社員は会議室を時間指定で予約できる, source: requirements.md }
  REQ-002: 同じ会議室で時間帯が重なる予約はできない
  REQ-003: 参加人数が会議室の定員を超える予約はできない
  REQ-004: 予約した本人は、開始時刻より前なら取り消せる
  REQ-005: 開始時刻の前後15分以内にチェックインする
  REQ-006: 15分チェックインがなければ自動で解放し、予約者に通知する
  REQ-007: 総務は会議室を利用停止にできる。利用停止中は予約できない

objectTypes:
  Member:
    displayName: 社員
    primaryKey: memberId
    titleProperty: name
    properties:
      memberId: string
      name: string
      role: { type: string, enum: [staff, admin] }

  Room:
    displayName: 会議室
    requirements: [REQ-003, REQ-007]
    primaryKey: roomId
    titleProperty: name
    properties:
      roomId: string
      name: string
      capacity: { type: integer, description: 入れる人数の上限 }
      status: { type: string, enum: [active, suspended] }

  Booking:
    displayName: 予約
    description: 取消や解放のあとも消さずに残す。
    requirements: [REQ-001, REQ-004]
    primaryKey: bookingId
    titleProperty: bookingId
    properties:
      bookingId: string
      startsAt: timestamp
      endsAt: timestamp
      attendees: integer
      status: { type: string, enum: [reserved, inUse, cancelled, released] }

linkTypes:
  bookingRoom:
    from: { objectType: Booking, name: room, cardinality: one }
    to: { objectType: Room, name: bookings, cardinality: many }
  bookingOrganizer:
    from: { objectType: Booking, name: organizer, cardinality: one }
    to: { objectType: Member, name: bookings, cardinality: many }

actionTypes:
  reserveRoom:
    displayName: 会議室を予約する
    requirements: [REQ-001, REQ-002, REQ-003, REQ-007]
    parameters:
      bookingId: { type: string, required: true }
      room: { type: objectRef, objectType: Room, required: true }
      organizer: { type: objectRef, objectType: Member, required: true }
      startsAt: { type: timestamp, required: true }
      endsAt: { type: timestamp, required: true }
      attendees: { type: integer, required: true }
    rules:
      - op: createObject
        objectType: Booking
        set: { bookingId: $bookingId, startsAt: $startsAt, endsAt: $endsAt, attendees: $attendees, status: reserved }
      - { op: createLink, linkType: bookingRoom, from: bookingId, to: room }
      - { op: createLink, linkType: bookingOrganizer, from: bookingId, to: organizer }
    validations:
      - description: 会議室が利用停止中でないこと
        requirements: [REQ-007]
        expr: "room.status == 'active'"
      - description: 参加人数が定員以下であること
        requirements: [REQ-003]
        expr: "attendees <= room.capacity"
      - description: 同じ会議室の予約済み・利用中の予約と時間帯が重ならないこと
        requirements: [REQ-002]

  cancelBooking:
    displayName: 予約を取り消す
    requirements: [REQ-004]
    parameters:
      booking: { type: objectRef, objectType: Booking, required: true }
      requestedBy: { type: objectRef, objectType: Member, required: true }
    rules:
      - { op: modifyObject, objectType: Booking, object: booking, set: { status: cancelled } }
    validations:
      - description: 取り消せるのは予約した本人だけ
        expr: "booking.organizer == requestedBy"
      - description: 開始前の予約済みの予約だけを取り消せる
        expr: "booking.status == 'reserved' && now() < booking.startsAt"
```

いくつか補足します。

- `Room` が REQ-003（定員）と REQ-007（利用停止）を参照しているのは、それらのルールに必要なプロパティを持っているからです。
- `reserveRoom` の validation は、それぞれが守る要件を1つずつ参照しています。validation の参照はそれだけで数え、アクションの参照を引き継ぎません。
- ほかに書くことがないプロパティは、`memberId: string` のような省略形で書いています。

## 5. 足りないものを「問題」パネルに指摘させる

「問題」パネル（`Cmd+Shift+M` / `Ctrl+Shift+M`）を開くと、台帳に2つの警告が出ています。

```text
Requirement "REQ-005" is not referenced by any element.
Requirement "REQ-006" is not referenced by any element.
```

これは `requirement-unreferenced` です。ファイルの誤りではなく、残っている作業の一覧です。チェックインと空予約の解放を実現する要素が、まだありません。

今度はわざと打ち間違えてみます。`cancelBooking` の `requirements: [REQ-004]` を `requirements: [REQ-04]` に変えると、その ID にエラーが出ます。

```text
Requirement "REQ-04" is not defined in requirements.
```

これは `requirement-undefined` で、参照した ID が台帳のどれとも一致しないことを示します。`REQ-004` に戻すとエラーは消えます。

このほか、1つのリストに同じ ID を2回書いた、ID に使えない文字がある、台帳の項目に見出しがない、台帳がないのに参照を書いた、といった場合にも診断が出ます。一覧は[形式リファレンス](../reference/object-ontology-format.md#要件の診断)にあります。

## 6. 図でレビューする

`Cmd+Alt+O` / `Ctrl+Alt+O` で図を開きます。業務担当者と一緒に見るのはこの画面です。

- **オブジェクト型とリンク**：社員、会議室、予約が箱で表示されます。2つのリンクには **N:1** のバッジが付きます。会議室1つに予約が複数、予約1つに会議室が1つ、という意味です。手順2の答えと合っているか確かめます。
- **Inspector**：**会議室**をクリックすると、Inspector にプロパティとリンクに加えて**要件**の欄が表示されます。

  ```text
  REQ-003 参加人数が会議室の定員を超える予約はできない
  REQ-007 総務は会議室を利用停止にできる。利用停止中は予約できない
  ```

  「この要件のために、会議室が持つべきものはこれで全部か」を業務担当者に確かめます。
- **アクションパネル**：ツールバーの**アクション**をクリックし、**会議室を予約する**を選びます。パラメーター、変更内容、**実行条件（満たさない場合は拒否）**（各条件の後ろに要件 ID が角かっこで付きます）、**要件**の欄が表示され、このアクションが関わるオブジェクト型が図上で強調されます。
- **SPARQL**：**SPARQL** をクリックし、サンプルから **9. 要件と、それを実現する要素** を選んで実行します。要件と要素の組ごとに1行ずつ表示されます。REQ-005 と REQ-006 には要素がなく、さきほどの警告と一致します。

レビューで出た問いと答えは記録に残します。レビューで概念が変わったら、まずオントロジーを直します。

## 7. CLI で確かめる

同じ検査は VS Code の外でも実行できます。[CLI リファレンス](../reference/cli.md#インストール)のとおり `oont` を使えるようにして、`room-booking` フォルダーのターミナルで実行します。

```text
$ oont validate room-booking.oont.yaml
room-booking.oont.yaml:10:3: warning: Requirement "REQ-005" is not referenced by any element. [requirement-unreferenced]
room-booking.oont.yaml:11:3: warning: Requirement "REQ-006" is not referenced by any element. [requirement-unreferenced]
1 file checked: 0 errors, 2 warnings
```

警告だけなら失敗にならないので、終了コードは 0 です。`--strict` を付けると警告も失敗として扱い、終了コードは 1 になります。マージ前にすべての要件が実現されていることを求めるなら、CI ではこちらを使います。

```text
$ oont validate room-booking.oont.yaml --strict
room-booking.oont.yaml:10:3: warning: Requirement "REQ-005" is not referenced by any element. [requirement-unreferenced]
room-booking.oont.yaml:11:3: warning: Requirement "REQ-006" is not referenced by any element. [requirement-unreferenced]
1 file checked: 0 errors, 2 warnings
$ echo $?
1
```

残りの作業を片づけます。ファイルの末尾（`actionTypes:` の下）に、次の2つのアクションを足してください。

```yaml
  checkIn:
    displayName: チェックインする
    requirements: [REQ-005]
    parameters:
      booking: { type: objectRef, objectType: Booking, required: true }
    rules:
      - { op: modifyObject, objectType: Booking, object: booking, set: { status: inUse } }
    validations:
      - description: 開始時刻の前後15分以内であること
        expr: "abs(minutesBetween(now(), booking.startsAt)) <= 15"

  releaseNoShow:
    displayName: 空予約を解放する
    description: システムが1分ごとに実行する。
    requirements: [REQ-006]
    x-trigger: { kind: schedule, every: 1m }
    parameters:
      booking: { type: objectRef, objectType: Booking, required: true }
    rules:
      - { op: modifyObject, objectType: Booking, object: booking, set: { status: released } }
    sideEffects:
      - 予約者に、予約を解放したことを通知する
```

`x-trigger` は拡張フィールドです。ツールは無視しますが、定期実行の仕組みを実装する人へのメモとして残ります。[`x-` 拡張フィールド](../reference/object-ontology-format.md#x--拡張フィールド)をご覧ください。

もう一度検証します。

```text
$ oont validate room-booking.oont.yaml --strict
1 file checked: 0 errors, 0 warnings
```

これで、すべての要件を少なくとも1つの要素が実現しています。AI エージェントにコンテキストとして渡す要約をエクスポートしてみます。

```text
$ oont export summary room-booking.oont.yaml
```

出力の一部を示します（要約の見出しや定型文は英語で出力されます）。

```markdown
# Ontology: 会議室予約

ダブルブッキングと空予約をなくす会議室予約。

Use these exact API names. Objects are identified by their type's primary key.
Only the actions listed below may change data; everything else is read-only.

## Object types

### Member ("社員")
Properties:
  - memberId: string (primary key)
  - name: string
  - role: string (one of: staff | admin)

### Room ("会議室")
Requirements: REQ-003, REQ-007
Properties:
  - roomId: string (primary key)
  - name: string
  - capacity: integer — 入れる人数の上限
  - status: string (one of: active | suspended)

...

## Actions (the only allowed writes)

### reserveRoom ("会議室を予約する")
Requirements: REQ-001, REQ-002, REQ-003, REQ-007
Parameters:
  - bookingId: string, required
  - room: Room (by primary key), required
  - organizer: Member (by primary key), required
  - startsAt: timestamp, required
  - endsAt: timestamp, required
  - attendees: integer, required
Effects:
  - createObject Booking (sets bookingId, startsAt, endsAt, attendees, status)
  - createLink bookingRoom
  - createLink bookingOrganizer
Rejected unless:
  - 会議室が利用停止中でないこと (requirements: REQ-007)
  - 参加人数が定員以下であること (requirements: REQ-003)
  - 同じ会議室の予約済み・利用中の予約と時間帯が重ならないこと (requirements: REQ-002)

...

## Requirements
- REQ-001: 社員は会議室を時間指定で予約できる — realized by object type Booking, action reserveRoom
- REQ-002: 同じ会議室で時間帯が重なる予約はできない — realized by action reserveRoom, a validation of action reserveRoom
- REQ-003: 参加人数が会議室の定員を超える予約はできない — realized by object type Room, action reserveRoom, a validation of action reserveRoom
- REQ-004: 予約した本人は、開始時刻より前なら取り消せる — realized by object type Booking, action cancelBooking
- REQ-005: 開始時刻の前後15分以内にチェックインする — realized by action checkIn
- REQ-006: 15分チェックインがなければ自動で解放し、予約者に通知する — realized by action releaseNoShow
- REQ-007: 総務は会議室を利用停止にできる。利用停止中は予約できない — realized by object type Room, action reserveRoom, a validation of action reserveRoom
```

要件を参照している要素には `Requirements:` の行が付き、`## Requirements` 節には要件ごとに実現している要素が並びます。`cancelBooking` を実装するエージェントは、それが REQ-004 のためのものだと分かります。レビューする人は、REQ-007 を変えたら何に影響するかをひと目で確かめられます。

アクションをエージェント用のツールとして提供するなら、ツール定義もエクスポートします。

```sh
oont export tools room-booking.oont.yaml -o room-booking.tools.json
```

これらのファイルを AI エージェントで使う方法は、[チュートリアル6](../ai/tutorial-6-object-ontology-ai-agents.md)と[チュートリアル8](../ai/tutorial-8-claude-code-object-ontology.md)で説明しています。

## 8. サンプルと見比べる

**ODD: サンプルオントロジーを作成...** → **会議室予約（Object Ontology）** を開きます。同じ要件を扱い、さらに先まで書いてあります。利用停止を独立したアクション `suspendRoom` にしている、終了時刻が開始時刻より後かを確かめている、予約に `checkedInAt` がある、`x-retention` のメモがある、サンプルオブジェクトがある、といった点です。`room-booking-sample.oont.yaml` などの名前で保存すれば、同じ検査を実行できます。

## このチュートリアルでしたこと

- YAML を書く前に、要件に ID を振り、決まっていない点を確かめた
- 要件をオブジェクト型、リンク、アクション、validation に落とし込んだ
- 各要素を要件につなぎ、`requirement-unreferenced` で残りの作業を、`requirement-undefined` で打ち間違いを見つけた
- 図、Inspector、アクションパネル、SPARQL でレビューした
- `oont validate` で検証し、`oont export summary` でエージェント向けのコンテキストを作った

## 次のステップ

- [Object Ontology 形式リファレンス](../reference/object-ontology-format.md)：すべてのフィールドを1か所に
- [CLI リファレンス](../reference/cli.md)：オプション、終了コード、CI での使い方
- [チュートリアル6：Object Ontology × AI エージェント](../ai/tutorial-6-object-ontology-ai-agents.md)：アクションをエージェントのツールにする
