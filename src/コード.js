"use strict";
let result = ""; //html内のテンプレート文字に展開させるためグローバルで宣言する
function doGet(e) {
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
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
// サイトのURLを返す
function thisUrl() {
    return ScriptApp.getService().getUrl();
}
// 前回の総走行距離を返す
function lastDistance() {
    var _a;
    // スプレッドシートを開く
    const sheetId = (_a = PropertiesService.getScriptProperties().getProperty("FUEL_DATA_SHEET")) !== null && _a !== void 0 ? _a : "";
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    const lastRow = sheet.getLastRow();
    return sheet.getRange("D" + lastRow).getValue();
}
function postToServer(postString) {
    Logger.log(`postToServer: ${postString}`);
    // json形式で送信されたデータをobjectに変換して取得
    const postData = JSON.parse(postString);
    switch (postData.page) {
        case "fuel":
            return fuelData(postData);
        case "medicine":
            return medicineData(postData);
        default:
            return "";
    }
}
function fuelData(postData) {
    var _a;
    try {
        // スプレッドシートを開く
        const sheetId = (_a = PropertiesService.getScriptProperties().getProperty("FUEL_DATA_SHEET")) !== null && _a !== void 0 ? _a : "";
        const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
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
        }
        else {
            const f = sheet.getRange("I" + lastRow).getValue();
            return `今回の燃費は ${f.toFixed(2)} km/L でした`;
        }
    }
    catch (error) {
        return "データの追加中にエラーが発生しました。";
    }
}
function medicineData(postData) {
    var _a;
    try {
        // スプレッドシートを開く
        const sheetId = (_a = PropertiesService.getScriptProperties().getProperty("MEDICINE_DATA_SHEET")) !== null && _a !== void 0 ? _a : "";
        const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
        // 最終行を下にコピー
        let lastRow = sheet.getLastRow();
        const srcRange = sheet.getRange(lastRow, 1, 1, 100);
        const dstRange = sheet.getRange(lastRow + 1, 1);
        srcRange.copyTo(dstRange);
        lastRow++;
        sheet.getRange("B" + lastRow).setValue(new Date());
        sheet.getRange("C" + lastRow).setValue(postData.date);
        sheet.getRange("D" + lastRow).setValue(postData.medicine);
        sheet.getRange("E" + lastRow).setValue(postData.quantity);
        sheet.getRange("F" + lastRow).setValue(postData.symptom);
        sheet.getRange("G" + lastRow).setValue(postData.memo);
        return `データを１件追加しました。`;
    }
    catch (error) {
        return "データの追加中にエラーが発生しました。";
    }
}
/**
 * 再送信ラベルのついたメールから下書きメールを作成する
 */
function makeDraftMail() {
    // ラベルの名前（ここでは「再送信」）を指定
    const labelName = "再送信";
    const emailLabel = GmailApp.getUserLabelByName(labelName);
    let counter = 0;
    // ラベルが存在する場合
    if (emailLabel) {
        const threads = emailLabel.getThreads();
        for (const thread of threads) {
            // メールスレッド（会話のやりとりを１つの塊にまとめたもの）の最古のメール
            let message = thread.getMessages()[0];
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
function createDraftFromMessage(message) {
    const recipient = message.getTo(); // 受信者のアドレス
    const subject = message.getSubject(); // 件名
    const body = message.getPlainBody(); // 本文（プレーンテキスト）
    return Boolean(GmailApp.createDraft(recipient, subject, body));
}
