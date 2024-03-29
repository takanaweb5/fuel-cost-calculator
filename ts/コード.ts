let result = ""; //html内のテンプレート文字に展開させるためグローバルで宣言する

interface Env {
  [key: string]: any;
}

const env: Env = new Proxy(PropertiesService.getScriptProperties(), {
  get(target, prop: string) {
    return target.getProperty(prop);
  },
  // set(target, prop: string, value) {
  //   target.setProperty(prop, value);
  //   return true; // 必要に応じてbooleanを返す
  // }
});

function doGet(e: GoogleAppsScript.Events.DoGet): any {
  Logger.log("doGet:" + JSON.stringify(e.parameter));

  // LINKで開かれたページを返す(?page=html名 のパラメータで指定させる)
  let page = e.parameter["page"];
  if (page == null) {
    //pageの指定のない時はデフォルトで"index.html"を開く
    page = "index";
  }
  if (page === "result") {
    switch (e.parameter["command"]) {
      case "remail":
        result = makeDraftMail();
        break;
    }
  }
  return HtmlService.createTemplateFromFile(page).evaluate()
    .addMetaTag('viewport', 'initial-scale=0.4, user-scalable=no');
}

// CSSやjavascriptをインクルードさせる
function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// サイトのURLを返す
function thisUrl() {
  return ScriptApp.getService().getUrl();
}

// データベースのレコード数を取得する
function recordCount(SheetName: string): number {
  // const sheetId: string = PropertiesService.getScriptProperties().getProperty("DATA_SHEET") ?? "";
  const sheetId = env.DATA_SHEET;
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(SheetName) as GoogleAppsScript.Spreadsheet.Sheet;
  const lastRow = sheet.getLastRow();
  return sheet.getRange("A" + lastRow).getValue();
}

// 前回の総走行距離を返す
function lastDistance() {
  // スプレッドシートを開く
  const sheetId = env.DATA_SHEET;
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName("燃費管理") as GoogleAppsScript.Spreadsheet.Sheet;
  const lastRow = sheet.getLastRow();
  return sheet.getRange("D" + lastRow).getValue();
}

function postToServer(target: string, postString: string): string {
  Logger.log(`postToServer: ${postString}`);
  // json形式で送信されたデータをobjectに変換して取得
  const postData = JSON.parse(postString);

  switch (target) {
    case "fuel":
      return fuelData(postData);
    case "medicine":
      return medicineData(postData);
    case "memo":
      return memoData(postData);
    default:
      return "";
  }
}

//　レコード番号,シート名を引数にしてレコード情報をjsonで返す
function getRecords(sheetName: string): string {
  const sheetId = env.DATA_SHEET;
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName) as GoogleAppsScript.Spreadsheet.Sheet;
  const data = sheet.getDataRange().getValues();
  return JSON.stringify(data);
}

function fuelData(postData: any): string {
  try {
    // スプレッドシートを開く
    const sheetId = env.DATA_SHEET;
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName("燃費管理") as GoogleAppsScript.Spreadsheet.Sheet;

    // 最終行を下にコピー
    let lastRow = sheet.getLastRow();
    const srcRange = sheet.getRange(lastRow, 1, 1, 100);
    const dstRange = sheet.getRange(lastRow + 1, 1);
    srcRange.copyTo(dstRange);
    lastRow++;
    sheet.getRange("B" + lastRow).setValue(new Date());
    sheet.getRange("C" + lastRow).setValue(postData.date);
    sheet.getRange("D" + lastRow).setValue(postData.distance);
    sheet.getRange("F" + lastRow).setValue(postData.pricePerLiter);
    sheet.getRange("G" + lastRow).setValue(postData.fuelAmount);
    sheet.getRange("H" + lastRow).setValue(postData.totalPrice);
    sheet.getRange("J" + lastRow).clearContent();
    if (postData.fuelType !== "true") {
      //限定給油
      sheet.getRange("J" + lastRow).setValue(true);
      return `今回の燃費は満タンでないため計算できません`;
    } else {
      const f = sheet.getRange("I" + lastRow).getValue();
      return `今回の燃費は ${f.toFixed(2)} km/L でした`;
    }
  } catch (error) {
    return "データの登録中にエラーが発生しました。";
  }
}

function medicineData(postData: any): string {
  try {
    // スプレッドシートを開く
    const sheetId = env.DATA_SHEET;
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName("お薬手帳") as GoogleAppsScript.Spreadsheet.Sheet;
    let updateRow = 0;
    const recordNumber: number = postData.recordNumber ?? 0;
    const lastRow = sheet.getLastRow();

    if (recordNumber == 0) {
      // 最終行を下にコピー
      const srcRange = sheet.getRange(lastRow, 1, 1, 100);
      const dstRange = sheet.getRange(lastRow + 1, 1);
      srcRange.copyTo(dstRange);
      updateRow = lastRow + 1;
    } else {
      const data = sheet.getRange("A2:A" + lastRow).getValues(); // A列のすべての値を取得
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] == recordNumber) {
          updateRow = i + 2;
          break;
        }
      }
      if (updateRow == 0) {
        return "データの更新に失敗しました";
      }
    }
    sheet.getRange("B" + updateRow).setValue(new Date());
    sheet.getRange("C" + updateRow).setValue(postData.date);
    sheet.getRange("D" + updateRow).setValue(postData.medicine);
    sheet.getRange("E" + updateRow).setValue(postData.quantity);
    sheet.getRange("F" + updateRow).setValue(postData.symptom);
    sheet.getRange("G" + updateRow).setValue(postData.memo);
    if (recordNumber == 0) {
      return `データを１件追加しました。`;
    } else {
      return `データを１件更新しました。`;
    }
  } catch (error) {
    return "データの登録中にエラーが発生しました。";
  }
}
function memoData(postData: any): string {
  try {
    // スプレッドシートを開く
    const sheetId = env.DATA_SHEET;
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName("メモ") as GoogleAppsScript.Spreadsheet.Sheet;
    let updateRow = 0;
    const recordNumber: number = postData.recordNumber ?? 0;
    const lastRow = sheet.getLastRow();

    if (recordNumber == 0) {
      // 最終行を下にコピー
      const srcRange = sheet.getRange(lastRow, 1, 1, 100);
      const dstRange = sheet.getRange(lastRow + 1, 1);
      srcRange.copyTo(dstRange);
      updateRow = lastRow + 1;
    } else {
      const data = sheet.getRange("A2:A" + lastRow).getValues(); // A列のすべての値を取得
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] == recordNumber) {
          updateRow = i + 2;
          break;
        }
      }
      if (updateRow == 0) {
        return "データの更新に失敗しました";
      }
    }
    sheet.getRange("B" + updateRow).setValue(new Date());
    sheet.getRange("C" + updateRow).setValue(postData.date);
    sheet.getRange("D" + updateRow).setValue(postData.memo);
    if (recordNumber == 0) {
      return `データを１件追加しました。`;
    } else {
      return `データを１件更新しました。`;
    }
  } catch (error) {
    return "データの登録中にエラーが発生しました。";
  }
}

/**
 * 再送信ラベルのついたメールから下書きメールを作成する
 */
function makeDraftMail(): string {
  // ラベルの名前（ここでは「再送信」）を指定
  const labelName = "再送信";
  const emailLabel: GoogleAppsScript.Gmail.GmailLabel = GmailApp.getUserLabelByName(labelName);
  let counter: number = 0;
  // ラベルが存在する場合
  if (emailLabel) {
    const threads: GoogleAppsScript.Gmail.GmailThread[] = emailLabel.getThreads();
    for (const thread of threads) {
      // メールスレッド（会話のやりとりを１つの塊にまとめたもの）の最古のメール
      let message: GoogleAppsScript.Gmail.GmailMessage = thread.getMessages()[0];
      if (createDraftFromMessage(message)) {
        thread.removeLabel(emailLabel);
        counter++;
      }
    }
  }
  return `${counter}件のメールを下書きに移動しました`;
}

/**
 * 送信済みメールから下書きメールを作成
 * @param message - 送信済みメール
 * @return - なし
 */
function createDraftFromMessage(message: GoogleAppsScript.Gmail.GmailMessage): boolean {
  const recipient = message.getTo(); // 受信者のアドレス
  const subject = message.getSubject(); // 件名
  const body = message.getPlainBody(); // 本文（プレーンテキスト）
  return Boolean(GmailApp.createDraft(recipient, subject, body));
}