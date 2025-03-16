// const { JSDOM } = require('jsdom');
import { JSDOM } from "jsdom";
let res = await fetch(`https://baike.baidu.com/item/北京`);
const info = await res.text();
function extractTextFromClasses(htmlStr) {
  const classPrefix = "mainContent_";
  // 创建一个新的 JSDOM 实例
  const dom = new JSDOM(htmlStr);
  // 获取 window 对象，以便访问 document
  const { window } = dom;
  // 使用 document.querySelectorAll 来选择所有匹配的元素
  const elements = window.document.querySelectorAll(
    `[class^="${classPrefix}"]`
  );
  let allText = "";

  elements.forEach((element) => {
    // 使用 element.textContent 来获取元素及其所有子节点的文本内容
    allText += element.textContent.trim() + "\n";
  });

  return allText.trim(); // 返回所有文本内容，并去除末尾的换行符
}

console.log(extractTextFromClasses(info));
