/* ============================================================
 * 甜心消消乐 · 手绘风 SVG 图标库
 * 每个图标在 100x100 viewBox 中绘制，引用 index.html 里的全局渐变
 * ============================================================ */
(function () {
  'use strict';

  var ICONS = {

    /* 1. 星星 —— 胖嘟嘟的渐变金星 + 高光 */
    star: ''
      + '<path fill="url(#gStar)" stroke="#e8930c" stroke-width="3" stroke-linejoin="round" d="'
      + 'M50 8 C54 8 56 14 59 24 L61 30 C62 34 66 37 70 37 L77 38 C88 39 90 44 83 51 L75 59 '
      + 'C72 62 71 66 72 70 L74 78 C76 88 72 92 63 87 L55 82 C52 80 48 80 45 82 L37 87 '
      + 'C28 92 24 88 26 78 L28 70 C29 66 28 62 25 59 L17 51 C10 44 12 39 23 38 L30 37 '
      + 'C34 37 38 34 39 30 L41 24 C44 14 46 8 50 8 Z"/>'
      + '<ellipse cx="40" cy="34" rx="9" ry="5" fill="#fff" opacity=".55" transform="rotate(-24 40 34)"/>'
      + '<circle cx="36" cy="50" r="3.2" fill="#7a4a12"/>'
      + '<circle cx="64" cy="50" r="3.2" fill="#7a4a12"/>'
      + '<path d="M42 60 Q50 67 58 60" fill="none" stroke="#7a4a12" stroke-width="3.4" stroke-linecap="round"/>'
      + '<circle cx="29" cy="56" r="4" fill="#ff9d5c" opacity=".55"/>'
      + '<circle cx="71" cy="56" r="4" fill="#ff9d5c" opacity=".55"/>',

    /* 2. 爱心 —— 亮面粉红爱心 */
    heart: ''
      + '<path fill="url(#gHeart)" stroke="#d12f6b" stroke-width="3" stroke-linejoin="round" d="'
      + 'M50 86 C40 76 14 60 14 38 C14 24 24 16 35 16 C42 16 47 20 50 25 '
      + 'C53 20 58 16 65 16 C76 16 86 24 86 38 C86 60 60 76 50 86 Z"/>'
      + '<path d="M28 32 C28 25 34 22 38 23" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>'
      + '<circle cx="40" cy="44" r="3.2" fill="#6d1039"/>'
      + '<circle cx="60" cy="44" r="3.2" fill="#6d1039"/>'
      + '<path d="M44 54 Q50 60 56 54" fill="none" stroke="#6d1039" stroke-width="3.2" stroke-linecap="round"/>'
      + '<circle cx="32" cy="50" r="4" fill="#ff7096" opacity=".6"/>'
      + '<circle cx="68" cy="50" r="4" fill="#ff7096" opacity=".6"/>',

    /* 3. 蝴蝶结 */
    bow: ''
      + '<path fill="url(#gBow)" stroke="#8a3fc9" stroke-width="3" stroke-linejoin="round" d="'
      + 'M48 42 C36 26 16 24 14 40 C12 54 22 62 34 60 L48 54 Z"/>'
      + '<path fill="url(#gBow)" stroke="#8a3fc9" stroke-width="3" stroke-linejoin="round" d="'
      + 'M52 42 C64 26 84 24 86 40 C88 54 78 62 66 60 L52 54 Z"/>'
      + '<path fill="#c88bf0" stroke="#8a3fc9" stroke-width="3" stroke-linejoin="round" d="'
      + 'M42 56 L34 82 L46 74 L50 82 L54 74 L66 82 L58 56 Z"/>'
      + '<rect x="41" y="38" width="18" height="20" rx="7" fill="#f0d7ff" stroke="#8a3fc9" stroke-width="3"/>'
      + '<path d="M24 38 C26 33 32 31 36 32" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".65"/>'
      + '<path d="M76 38 C74 33 68 31 64 32" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".65"/>',

    /* 4. 草莓 */
    strawberry: ''
      + '<path fill="url(#gLeaf)" stroke="#2f7d33" stroke-width="2.6" stroke-linejoin="round" d="'
      + 'M50 22 C46 12 38 8 30 10 C36 14 38 19 39 24 Z M50 22 C54 12 62 8 70 10 C64 14 62 19 61 24 Z"/>'
      + '<path fill="url(#gStraw)" stroke="#b01e33" stroke-width="3" stroke-linejoin="round" d="'
      + 'M50 90 C38 78 20 62 20 42 C20 28 32 20 50 20 C68 20 80 28 80 42 C80 62 62 78 50 90 Z"/>'
      + '<g fill="#ffe9a8" stroke="#d99b3f" stroke-width=".8">'
      + '<ellipse cx="37" cy="42" rx="2.6" ry="3.6"/><ellipse cx="63" cy="42" rx="2.6" ry="3.6"/>'
      + '<ellipse cx="50" cy="52" rx="2.6" ry="3.6"/><ellipse cx="31" cy="58" rx="2.4" ry="3.2"/>'
      + '<ellipse cx="69" cy="58" rx="2.4" ry="3.2"/><ellipse cx="43" cy="68" rx="2.4" ry="3.2"/>'
      + '<ellipse cx="57" cy="68" rx="2.4" ry="3.2"/><ellipse cx="50" cy="78" rx="2.2" ry="3"/></g>'
      + '<path d="M30 38 C31 31 38 27 44 27" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" opacity=".65"/>',

    /* 5. 猫咪 */
    cat: ''
      + '<path fill="url(#gCat)" stroke="#d07a26" stroke-width="3" stroke-linejoin="round" d="'
      + 'M24 30 L18 10 L40 20 Z M76 30 L82 10 L60 20 Z"/>'
      + '<path fill="#ffb0c4" d="M26 26 L23 15 L35 21 Z M74 26 L77 15 L65 21 Z"/>'
      + '<circle cx="50" cy="54" r="36" fill="url(#gCat)" stroke="#d07a26" stroke-width="3"/>'
      + '<path d="M30 22 L36 32 M42 18 L45 29 M70 22 L64 32 M58 18 L55 29" stroke="#d07a26" stroke-width="3" stroke-linecap="round" opacity=".55"/>'
      + '<circle cx="37" cy="52" r="4" fill="#5c3a17"/>'
      + '<circle cx="63" cy="52" r="4" fill="#5c3a17"/>'
      + '<circle cx="38.4" cy="50.6" r="1.4" fill="#fff"/><circle cx="64.4" cy="50.6" r="1.4" fill="#fff"/>'
      + '<path d="M46 62 L54 62 L50 67 Z" fill="#ef6a8a" stroke="#d14f70" stroke-width="1.6" stroke-linejoin="round"/>'
      + '<path d="M50 67 Q50 72 44 71 M50 67 Q50 72 56 71" fill="none" stroke="#5c3a17" stroke-width="2.6" stroke-linecap="round"/>'
      + '<path d="M16 52 L30 55 M17 62 L30 60 M84 52 L70 55 M83 62 L70 60" stroke="#d07a26" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>'
      + '<circle cx="28" cy="63" r="5" fill="#ff9d9d" opacity=".55"/>'
      + '<circle cx="72" cy="63" r="5" fill="#ff9d9d" opacity=".55"/>',

    /* 6. 月亮 —— 奶油色弯月 + 小星星 */
    moon: ''
      + '<path fill="url(#gMoon)" stroke="#dd9226" stroke-width="3" stroke-linejoin="round" fill-rule="evenodd" d="'
      + 'M8 52 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0 Z '
      + 'M32 42 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0 Z"/>'
      + '<path d="M78 38 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z" fill="#fff" opacity=".95"/>'
      + '<circle cx="86" cy="62" r="2.4" fill="#fff" opacity=".85"/>'
      + '<circle cx="44" cy="48" r="3" fill="#8a5a10"/>'
      + '<path d="M36 60 Q42 66 48 60" fill="none" stroke="#8a5a10" stroke-width="3" stroke-linecap="round"/>'
      + '<circle cx="34" cy="54" r="3.6" fill="#ffab5c" opacity=".5"/>',

    /* 7. 小花 */
    flower: ''
      + '<g stroke="#d14f92" stroke-width="2.6">'
      + '<ellipse cx="50" cy="24" rx="13" ry="16" fill="url(#gPetal)"/>'
      + '<ellipse cx="50" cy="24" rx="13" ry="16" fill="url(#gPetal)" transform="rotate(72 50 50)"/>'
      + '<ellipse cx="50" cy="24" rx="13" ry="16" fill="url(#gPetal)" transform="rotate(144 50 50)"/>'
      + '<ellipse cx="50" cy="24" rx="13" ry="16" fill="url(#gPetal)" transform="rotate(216 50 50)"/>'
      + '<ellipse cx="50" cy="24" rx="13" ry="16" fill="url(#gPetal)" transform="rotate(288 50 50)"/>'
      + '</g>'
      + '<circle cx="50" cy="50" r="13" fill="#ffd94d" stroke="#e8930c" stroke-width="2.6"/>'
      + '<circle cx="46" cy="47" r="2.2" fill="#a3611a"/><circle cx="54" cy="47" r="2.2" fill="#a3611a"/>'
      + '<path d="M45 52 Q50 57 55 52" fill="none" stroke="#a3611a" stroke-width="2.4" stroke-linecap="round"/>'
      + '<ellipse cx="44" cy="16" rx="4" ry="6" fill="#fff" opacity=".5" transform="rotate(-14 44 16)"/>',

    /* 8. 纸杯蛋糕 */
    cake: ''
      + '<path fill="#ff5f7e" stroke="#c2324f" stroke-width="2.4" d="M50 6 a6 6 0 110 12 a6 6 0 110 -12 Z"/>'
      + '<path d="M50 12 L50 18" stroke="#7a4a12" stroke-width="2.6" stroke-linecap="round"/>'
      + '<path fill="url(#gCake)" stroke="#c94f86" stroke-width="3" stroke-linejoin="round" d="'
      + 'M50 18 C36 18 26 28 26 40 C26 44 28 47 31 47 C35 47 35 43 38 43 C41 43 41 48 45 48 '
      + 'C49 48 48 43 52 43 C56 43 55 48 59 48 C63 48 62 43 66 43 C69 43 69 47 72 47 '
      + 'C75 47 78 44 78 40 C78 28 66 18 50 18 Z"/>'
      + '<path fill="url(#gCup)" stroke="#6d3fd1" stroke-width="3" stroke-linejoin="round" d="'
      + 'M30 52 L36 88 C36.5 91 39 93 43 93 L61 93 C65 93 67.5 91 68 88 L74 52 Z"/>'
      + '<path d="M40 55 L43 88 M52 55 L52 90 M64 55 L61 88" stroke="#6d3fd1" stroke-width="2.2" opacity=".5" stroke-linecap="round"/>'
      + '<circle cx="40" cy="32" r="3" fill="#5f2040"/><circle cx="60" cy="32" r="3" fill="#5f2040"/>'
      + '<path d="M44 38 Q50 43 56 38" fill="none" stroke="#5f2040" stroke-width="2.6" stroke-linecap="round"/>'
      + '<circle cx="34" cy="24" r="2" fill="#fff" opacity=".8"/>',

    /* 9. 彩虹 */
    rainbow: ''
      + '<g fill="none" stroke-linecap="round">'
      + '<path d="M18 62 A32 32 0 0182 62" stroke="#ff6b81" stroke-width="10"/>'
      + '<path d="M26 62 A24 24 0 0174 62" stroke="#ffb84d" stroke-width="10"/>'
      + '<path d="M34 62 A16 16 0 0166 62" stroke="#ffe066" stroke-width="10"/>'
      + '<path d="M42 62 A8 8 0 0158 62" stroke="#7edb8f" stroke-width="10"/>'
      + '</g>'
      + '<g fill="#fff" stroke="#cdd7e5" stroke-width="2.4">'
      + '<ellipse cx="22" cy="66" rx="13" ry="9"/><ellipse cx="34" cy="68" rx="12" ry="8"/>'
      + '<ellipse cx="66" cy="68" rx="12" ry="8"/><ellipse cx="78" cy="66" rx="13" ry="9"/>'
      + '</g>'
      + '<circle cx="30" cy="65" r="2" fill="#5b6b7f"/><circle cx="72" cy="65" r="2" fill="#5b6b7f"/>'
      + '<path d="M25 69 Q30 72 35 69 M67 69 Q72 72 77 69" fill="none" stroke="#5b6b7f" stroke-width="1.8" stroke-linecap="round"/>',

    /* 10. 贝壳 */
    shell: ''
      + '<path fill="url(#gShell)" stroke="#c25a97" stroke-width="3" stroke-linejoin="round" d="'
      + 'M50 12 C72 12 88 32 88 56 C88 74 76 84 66 88 L34 88 C24 84 12 74 12 56 C12 32 28 12 50 12 Z"/>'
      + '<g fill="none" stroke="#c25a97" stroke-width="2.6" stroke-linecap="round" opacity=".75">'
      + '<path d="M50 16 L50 84"/>'
      + '<path d="M50 16 C40 30 34 50 33 82"/>'
      + '<path d="M50 16 C60 30 66 50 67 82"/>'
      + '<path d="M50 16 C30 28 22 46 21 66"/>'
      + '<path d="M50 16 C70 28 78 46 79 66"/>'
      + '</g>'
      + '<path d="M28 34 C31 26 38 21 44 20" fill="none" stroke="#fff" stroke-width="4.4" stroke-linecap="round" opacity=".6"/>'
      + '<path d="M34 88 L66 88 L62 94 L38 94 Z" fill="#e879b9" stroke="#c25a97" stroke-width="2.4" stroke-linejoin="round"/>',

    /* 11. 樱桃 */
    cherry: ''
      + '<path d="M50 12 C56 20 62 30 64 44 M50 12 C46 22 40 32 36 44" fill="none" stroke="#7c4a1e" stroke-width="4" stroke-linecap="round"/>'
      + '<path fill="url(#gLeaf)" stroke="#2f7d33" stroke-width="2.2" d="M50 12 C58 4 70 4 76 10 C70 18 58 18 50 12 Z"/>'
      + '<circle cx="34" cy="62" r="22" fill="url(#gCherry)" stroke="#9f1239" stroke-width="3"/>'
      + '<circle cx="66" cy="58" r="20" fill="url(#gCherry)" stroke="#9f1239" stroke-width="3"/>'
      + '<ellipse cx="27" cy="54" rx="6" ry="4" fill="#fff" opacity=".65" transform="rotate(-28 27 54)"/>'
      + '<ellipse cx="60" cy="50" rx="5" ry="3.4" fill="#fff" opacity=".65" transform="rotate(-28 60 50)"/>'
      + '<circle cx="30" cy="66" r="2.6" fill="#5f0f24"/><circle cx="40" cy="66" r="2.6" fill="#5f0f24"/>'
      + '<path d="M31 72 Q35 75 39 72" fill="none" stroke="#5f0f24" stroke-width="2.2" stroke-linecap="round"/>',

    /* 12. 小熊 */
    bear: ''
      + '<circle cx="26" cy="26" r="13" fill="url(#gBear)" stroke="#8f5a24" stroke-width="3"/>'
      + '<circle cx="74" cy="26" r="13" fill="url(#gBear)" stroke="#8f5a24" stroke-width="3"/>'
      + '<circle cx="26" cy="26" r="6" fill="#f7d9b8"/>'
      + '<circle cx="74" cy="26" r="6" fill="#f7d9b8"/>'
      + '<circle cx="50" cy="56" r="34" fill="url(#gBear)" stroke="#8f5a24" stroke-width="3"/>'
      + '<ellipse cx="50" cy="66" rx="16" ry="12" fill="#f7d9b8"/>'
      + '<ellipse cx="50" cy="61" rx="5.6" ry="4.4" fill="#5c3a17"/>'
      + '<path d="M50 65 Q50 71 44 70 M50 65 Q50 71 56 70" fill="none" stroke="#5c3a17" stroke-width="2.6" stroke-linecap="round"/>'
      + '<circle cx="36" cy="50" r="4" fill="#3f2710"/>'
      + '<circle cx="64" cy="50" r="4" fill="#3f2710"/>'
      + '<circle cx="37.4" cy="48.6" r="1.4" fill="#fff"/><circle cx="65.4" cy="48.6" r="1.4" fill="#fff"/>'
      + '<circle cx="28" cy="62" r="5" fill="#ef8f8f" opacity=".5"/>'
      + '<circle cx="72" cy="62" r="5" fill="#ef8f8f" opacity=".5"/>'
  };

  var ORDER = ['star','heart','bow','strawberry','cat','moon','flower','cake','rainbow','shell','cherry','bear'];

  /* 图标中文名（用于无障碍 & 提示） */
  var NAMES = {
    star:'星星', heart:'爱心', bow:'蝴蝶结', strawberry:'草莓', cat:'猫咪', moon:'月亮',
    flower:'小花', cake:'蛋糕', rainbow:'彩虹', shell:'贝壳', cherry:'樱桃', bear:'小熊'
  };

  function svgOf(key) {
    return '<svg viewBox="0 0 100 100" role="img" aria-label="' + NAMES[key] + '">' + ICONS[key] + '</svg>';
  }

  window.SweetIcons = { ORDER: ORDER, NAMES: NAMES, svgOf: svgOf };
})();
