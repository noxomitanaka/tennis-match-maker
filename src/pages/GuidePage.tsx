import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function GuidePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">使い方ガイド</h1>
        <Link to="/">
          <Button variant="outline" size="sm">トップに戻る</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</span>
              <div>
                <h2 className="font-bold text-lg mb-2">大会をつくる</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  トップページの「新規大会」ボタンを押してください。
                </p>
                <div className="text-sm space-y-2 leading-relaxed">
                  <p>大会名を入れて、種別を選びます。</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><span className="text-foreground font-medium">シングルス</span> … 1人ずつ対戦</li>
                    <li><span className="text-foreground font-medium">ダブルス</span> … 2人1組のペアで対戦</li>
                    <li><span className="text-foreground font-medium">団体戦</span> … チーム単位で対戦</li>
                  </ul>
                  <p className="mt-2">参加人数の上限（定員）がある場合は「定員」の欄に数字を入れてください。空のままでも大丈夫です。</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1.5 - Format */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</span>
              <div>
                <h2 className="font-bold text-lg mb-2">大会の形式を選ぶ</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  3つの形式から選べます。
                </p>
                <div className="text-sm space-y-3">
                  <div className="p-3 bg-muted/50 rounded-[var(--radius)]">
                    <p className="font-medium">スイスドロー</p>
                    <p className="text-muted-foreground mt-1">
                      勝ち数が近い人同士が毎ラウンド自動で組み合わされます。全員が同じ回数だけ試合できるので、参加者が多いときにおすすめです。
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-[var(--radius)]">
                    <p className="font-medium">トーナメント（勝ち抜き戦）</p>
                    <p className="text-muted-foreground mt-1">
                      負けたら終わりの勝ち抜き戦です。3位決定戦やコンソレーション（敗者復活）も設定できます。
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-[var(--radius)]">
                    <p className="font-medium">リーグ → トーナメント</p>
                    <p className="text-muted-foreground mt-1">
                      最初にグループに分かれて総当たり戦をして、上位の人が勝ち抜きトーナメントに進みます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</span>
              <div>
                <h2 className="font-bold text-lg mb-2">参加者を登録する</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  大会を作ったら、「参加者」タブが開きます。ここで参加者を登録します。
                </p>
                <div className="text-sm space-y-2 leading-relaxed">
                  <p><span className="font-medium">1人ずつ追加する場合</span></p>
                  <p className="text-muted-foreground">名前の欄に入力して「追加」ボタンを押します。ダブルスの場合は2人分の名前を入れます。</p>

                  <p className="mt-3"><span className="font-medium">まとめて追加する場合（CSV）</span></p>
                  <p className="text-muted-foreground">
                    「CSVテンプレート」ボタンを押すと、専用のひな形ファイルがダウンロードされます。
                    Excelやスプレッドシートでそのファイルを開いて参加者の名前を入力し、保存してください。
                    次に「CSVアップロード」エリアにそのファイルをドラッグ＆ドロップするか、「ファイルを選択」で選んでください。
                    プレビューが表示されるので、内容を確認して「確定」を押すと一括登録されます。
                  </p>
                  <p className="text-muted-foreground mt-2">
                    一度使ったCSVファイルを保存しておけば、次の大会でも名前を書き換えるだけで使い回せます。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</span>
              <div>
                <h2 className="font-bold text-lg mb-2">試合を始める</h2>
                <div className="text-sm space-y-2 leading-relaxed">
                  <div className="p-3 bg-muted/50 rounded-[var(--radius)]">
                    <p className="font-medium">スイスドローの場合</p>
                    <p className="text-muted-foreground mt-1">
                      「ラウンド」タブで「次のラウンドを生成」ボタンを押すと、対戦カードが自動で作られます。
                      各試合の結果を入力していきます。全試合が終わったら「ラウンド確定」を押してください。
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-[var(--radius)]">
                    <p className="font-medium">トーナメントの場合</p>
                    <p className="text-muted-foreground mt-1">
                      「ドロー」タブでトーナメント表が表示されます。各試合をタップしてスコアを入力してください。
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-[var(--radius)]">
                    <p className="font-medium">リーグ→トーナメントの場合</p>
                    <p className="text-muted-foreground mt-1">
                      まず「グループ」タブでグループ分けをして、各グループの総当たり戦の結果を入力します。
                      全グループが終わったら「決勝トーナメントへ」に進みます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4 */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">5</span>
              <div>
                <h2 className="font-bold text-lg mb-2">スコアを入力する</h2>
                <div className="text-sm space-y-2 leading-relaxed">
                  <p className="text-muted-foreground">
                    対戦カードをタップすると、スコア入力画面が開きます。
                  </p>
                  <p className="text-muted-foreground">
                    セットごとのゲーム数を入力してください。タイブレークがあった場合はタイブレークのスコアも入力できます。
                    入力が終わったら「保存」を押してください。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 5 */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">6</span>
              <div>
                <h2 className="font-bold text-lg mb-2">順位を確認する・印刷する</h2>
                <div className="text-sm space-y-2 leading-relaxed">
                  <p className="text-muted-foreground">
                    「順位表」タブを開くと、現在の順位がリアルタイムで表示されます。
                  </p>
                  <p className="text-muted-foreground">
                    大会ページの「印刷」ボタンを押すと、A4用紙にきれいに収まる形式で印刷できます。
                    ブラウザの印刷画面が出たら、「PDFとして保存」を選ぶとPDFファイルにもできます。
                  </p>
                  <p className="text-muted-foreground">
                    参加者だけ登録した状態で印刷すれば、空欄のリーグ表やトーナメント表を事前に配ることもできます。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="font-bold text-lg mb-3">知っておくと便利なこと</h2>
            <div className="text-sm space-y-3 leading-relaxed">
              <div className="flex gap-2">
                <span className="text-muted-foreground flex-shrink-0">●</span>
                <p><span className="font-medium">途中棄権</span> … 参加者タブで名前の横にある「棄権」を押すと、次のラウンドから対戦組み合わせに入らなくなります。復帰もできます。</p>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground flex-shrink-0">●</span>
                <p><span className="font-medium">欠席管理</span> … 当日来なかった人を「欠席」に設定できます。その人の試合は不戦勝になります。</p>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground flex-shrink-0">●</span>
                <p><span className="font-medium">対戦の入れ替え</span> … ラウンド画面で参加者をドラッグして、対戦相手を手動で入れ替えることができます。</p>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground flex-shrink-0">●</span>
                <p><span className="font-medium">データのバックアップ</span> … 「データ管理」からエクスポート（書き出し）ができます。大会のデータを別のスマホやパソコンに移すときに使います。</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center pb-4">
          <Link to="/">
            <Button variant="outline">トップに戻る</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
