!function(e,t){if("object"==typeof exports&&"object"==typeof module)module.exports=t(require("@angular/core"),require("@angular/common"),require("tabby-core"),require("@ng-bootstrap/ng-bootstrap"),function(){try{return require("fs")}catch(e){}}());else if("function"==typeof define&&define.amd)define(["@angular/core","@angular/common","tabby-core","@ng-bootstrap/ng-bootstrap","fs"],t);else{var r="object"==typeof exports?t(require("@angular/core"),require("@angular/common"),require("tabby-core"),require("@ng-bootstrap/ng-bootstrap"),function(){try{return require("fs")}catch(e){}}()):t(e["@angular/core"],e["@angular/common"],e["tabby-core"],e["@ng-bootstrap/ng-bootstrap"],e.fs);for(var i in r)("object"==typeof exports?exports:e)[i]=r[i]}}(global,(e,t,r,i,n)=>(()=>{var s={245:(e,t,r)=>{var i=r(/*! !!../node_modules/pug-loader/index.js??ruleSet[1].rules[3].use[1]!./src/components/messageBoxModal.component.pug?ngResource */545);e.exports=(i.default||i).apply(i,[])},529:e=>{"use strict";e.exports=function(e){var t=[];return t.toString=function(){return this.map(function(t){var r="",i=void 0!==t[5];return t[4]&&(r+="@supports (".concat(t[4],") {")),t[2]&&(r+="@media ".concat(t[2]," {")),i&&(r+="@layer".concat(t[5].length>0?" ".concat(t[5]):""," {")),r+=e(t),i&&(r+="}"),t[2]&&(r+="}"),t[4]&&(r+="}"),r}).join("")},t.i=function(e,r,i,n,s){"string"==typeof e&&(e=[[null,e,void 0]]);var o={};if(i)for(var a=0;a<this.length;a++){var l=this[a][0];null!=l&&(o[l]=!0)}for(var d=0;d<e.length;d++){var c=[].concat(e[d]);i&&o[c[0]]||(void 0!==s&&(void 0===c[5]||(c[1]="@layer".concat(c[5].length>0?" ".concat(c[5]):""," {").concat(c[1],"}")),c[5]=s),r&&(c[2]&&(c[1]="@media ".concat(c[2]," {").concat(c[1],"}")),c[2]=r),n&&(c[4]?(c[1]="@supports (".concat(c[4],") {").concat(c[1],"}"),c[4]=n):c[4]="".concat(n)),t.push(c))}},t}},230:e=>{"use strict";e.exports=function(e){var t=e[1],r=e[3];if(!r)return t;if("function"==typeof btoa){var i=btoa(unescape(encodeURIComponent(JSON.stringify(r))));return[t].concat(["/*# ".concat("sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(i)," */")]).join("\n")}return[t].join("\n")}},441:function(e){e.exports=function(e){var t={};function r(i){if(t[i])return t[i].exports;var n=t[i]={i:i,l:!1,exports:{}};return e[i].call(n.exports,n,n.exports,r),n.l=!0,n.exports}return r.m=e,r.c=t,r.d=function(e,t,i){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t||4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(r.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var n in e)r.d(i,n,(function(t){return e[t]}).bind(null,n));return i},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=90)}({17:function(e,t,r){"use strict";t.__esModule=!0,t.default=void 0;var i=r(18),n=function(){function e(){}return e.getFirstMatch=function(e,t){var r=t.match(e);return r&&r.length>0&&r[1]||""},e.getSecondMatch=function(e,t){var r=t.match(e);return r&&r.length>1&&r[2]||""},e.matchAndReturnConst=function(e,t,r){if(e.test(t))return r},e.getWindowsVersionName=function(e){switch(e){case"NT":return"NT";case"XP":case"NT 5.1":return"XP";case"NT 5.0":return"2000";case"NT 5.2":return"2003";case"NT 6.0":return"Vista";case"NT 6.1":return"7";case"NT 6.2":return"8";case"NT 6.3":return"8.1";case"NT 10.0":return"10";default:return}},e.getMacOSVersionName=function(e){var t=e.split(".").splice(0,2).map(function(e){return parseInt(e,10)||0});if(t.push(0),10===t[0])switch(t[1]){case 5:return"Leopard";case 6:return"Snow Leopard";case 7:return"Lion";case 8:return"Mountain Lion";case 9:return"Mavericks";case 10:return"Yosemite";case 11:return"El Capitan";case 12:return"Sierra";case 13:return"High Sierra";case 14:return"Mojave";case 15:return"Catalina";default:return}},e.getAndroidVersionName=function(e){var t=e.split(".").splice(0,2).map(function(e){return parseInt(e,10)||0});if(t.push(0),!(1===t[0]&&t[1]<5))return 1===t[0]&&t[1]<6?"Cupcake":1===t[0]&&t[1]>=6?"Donut":2===t[0]&&t[1]<2?"Eclair":2===t[0]&&2===t[1]?"Froyo":2===t[0]&&t[1]>2?"Gingerbread":3===t[0]?"Honeycomb":4===t[0]&&t[1]<1?"Ice Cream Sandwich":4===t[0]&&t[1]<4?"Jelly Bean":4===t[0]&&t[1]>=4?"KitKat":5===t[0]?"Lollipop":6===t[0]?"Marshmallow":7===t[0]?"Nougat":8===t[0]?"Oreo":9===t[0]?"Pie":void 0},e.getVersionPrecision=function(e){return e.split(".").length},e.compareVersions=function(t,r,i){void 0===i&&(i=!1);var n=e.getVersionPrecision(t),s=e.getVersionPrecision(r),o=Math.max(n,s),a=0,l=e.map([t,r],function(t){var r=o-e.getVersionPrecision(t),i=t+Array(r+1).join(".0");return e.map(i.split("."),function(e){return Array(20-e.length).join("0")+e}).reverse()});for(i&&(a=o-Math.min(n,s)),o-=1;o>=a;){if(l[0][o]>l[1][o])return 1;if(l[0][o]===l[1][o]){if(o===a)return 0;o-=1}else if(l[0][o]<l[1][o])return -1}},e.map=function(e,t){var r,i=[];if(Array.prototype.map)return Array.prototype.map.call(e,t);for(r=0;r<e.length;r+=1)i.push(t(e[r]));return i},e.find=function(e,t){var r,i;if(Array.prototype.find)return Array.prototype.find.call(e,t);for(r=0,i=e.length;r<i;r+=1){var n=e[r];if(t(n,r))return n}},e.assign=function(e){for(var t,r,i=e,n=arguments.length,s=Array(n>1?n-1:0),o=1;o<n;o++)s[o-1]=arguments[o];if(Object.assign)return Object.assign.apply(Object,[e].concat(s));for(t=0,r=s.length;t<r;t+=1)(function(){var e=s[t];"object"==typeof e&&null!==e&&Object.keys(e).forEach(function(t){i[t]=e[t]})})();return e},e.getBrowserAlias=function(e){return i.BROWSER_ALIASES_MAP[e]},e.getBrowserTypeByAlias=function(e){return i.BROWSER_MAP[e]||""},e}();t.default=n,e.exports=t.default},18:function(e,t,r){"use strict";t.__esModule=!0,t.ENGINE_MAP=t.OS_MAP=t.PLATFORMS_MAP=t.BROWSER_MAP=t.BROWSER_ALIASES_MAP=void 0,t.BROWSER_ALIASES_MAP={"Amazon Silk":"amazon_silk","Android Browser":"android",Bada:"bada",BlackBerry:"blackberry",Chrome:"chrome",Chromium:"chromium",Electron:"electron",Epiphany:"epiphany",Firefox:"firefox",Focus:"focus",Generic:"generic","Google Search":"google_search",Googlebot:"googlebot","Internet Explorer":"ie","K-Meleon":"k_meleon",Maxthon:"maxthon","Microsoft Edge":"edge","MZ Browser":"mz","NAVER Whale Browser":"naver",Opera:"opera","Opera Coast":"opera_coast",PhantomJS:"phantomjs",Puffin:"puffin",QupZilla:"qupzilla",QQ:"qq",QQLite:"qqlite",Safari:"safari",Sailfish:"sailfish","Samsung Internet for Android":"samsung_internet",SeaMonkey:"seamonkey",Sleipnir:"sleipnir",Swing:"swing",Tizen:"tizen","UC Browser":"uc",Vivaldi:"vivaldi","WebOS Browser":"webos",WeChat:"wechat","Yandex Browser":"yandex",Roku:"roku"},t.BROWSER_MAP={amazon_silk:"Amazon Silk",android:"Android Browser",bada:"Bada",blackberry:"BlackBerry",chrome:"Chrome",chromium:"Chromium",electron:"Electron",epiphany:"Epiphany",firefox:"Firefox",focus:"Focus",generic:"Generic",googlebot:"Googlebot",google_search:"Google Search",ie:"Internet Explorer",k_meleon:"K-Meleon",maxthon:"Maxthon",edge:"Microsoft Edge",mz:"MZ Browser",naver:"NAVER Whale Browser",opera:"Opera",opera_coast:"Opera Coast",phantomjs:"PhantomJS",puffin:"Puffin",qupzilla:"QupZilla",qq:"QQ Browser",qqlite:"QQ Browser Lite",safari:"Safari",sailfish:"Sailfish",samsung_internet:"Samsung Internet for Android",seamonkey:"SeaMonkey",sleipnir:"Sleipnir",swing:"Swing",tizen:"Tizen",uc:"UC Browser",vivaldi:"Vivaldi",webos:"WebOS Browser",wechat:"WeChat",yandex:"Yandex Browser"},t.PLATFORMS_MAP={tablet:"tablet",mobile:"mobile",desktop:"desktop",tv:"tv"},t.OS_MAP={WindowsPhone:"Windows Phone",Windows:"Windows",MacOS:"macOS",iOS:"iOS",Android:"Android",WebOS:"WebOS",BlackBerry:"BlackBerry",Bada:"Bada",Tizen:"Tizen",Linux:"Linux",ChromeOS:"Chrome OS",PlayStation4:"PlayStation 4",Roku:"Roku"},t.ENGINE_MAP={EdgeHTML:"EdgeHTML",Blink:"Blink",Trident:"Trident",Presto:"Presto",Gecko:"Gecko",WebKit:"WebKit"}},90:function(e,t,r){"use strict";t.__esModule=!0,t.default=void 0;var i,n=(i=r(91))&&i.__esModule?i:{default:i},s=r(18),o=function(){function e(){}return e.getParser=function(e,t){if(void 0===t&&(t=!1),"string"!=typeof e)throw Error("UserAgent should be a string");return new n.default(e,t)},e.parse=function(e){return new n.default(e).getResult()},function(e,t){for(var r=0;r<t.length;r++){var i=t[r];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}(e,[{key:"BROWSER_MAP",get:function(){return s.BROWSER_MAP}},{key:"ENGINE_MAP",get:function(){return s.ENGINE_MAP}},{key:"OS_MAP",get:function(){return s.OS_MAP}},{key:"PLATFORMS_MAP",get:function(){return s.PLATFORMS_MAP}}]),e}();t.default=o,e.exports=t.default},91:function(e,t,r){"use strict";t.__esModule=!0,t.default=void 0;var i=l(r(92)),n=l(r(93)),s=l(r(94)),o=l(r(95)),a=l(r(17));function l(e){return e&&e.__esModule?e:{default:e}}var d=function(){function e(e,t){if(void 0===t&&(t=!1),null==e||""===e)throw Error("UserAgent parameter can't be empty");this._ua=e,this.parsedResult={},!0!==t&&this.parse()}var t=e.prototype;return t.getUA=function(){return this._ua},t.test=function(e){return e.test(this._ua)},t.parseBrowser=function(){var e=this;this.parsedResult.browser={};var t=a.default.find(i.default,function(t){if("function"==typeof t.test)return t.test(e);if(t.test instanceof Array)return t.test.some(function(t){return e.test(t)});throw Error("Browser's test function is not valid")});return t&&(this.parsedResult.browser=t.describe(this.getUA())),this.parsedResult.browser},t.getBrowser=function(){return this.parsedResult.browser?this.parsedResult.browser:this.parseBrowser()},t.getBrowserName=function(e){return e?String(this.getBrowser().name).toLowerCase()||"":this.getBrowser().name||""},t.getBrowserVersion=function(){return this.getBrowser().version},t.getOS=function(){return this.parsedResult.os?this.parsedResult.os:this.parseOS()},t.parseOS=function(){var e=this;this.parsedResult.os={};var t=a.default.find(n.default,function(t){if("function"==typeof t.test)return t.test(e);if(t.test instanceof Array)return t.test.some(function(t){return e.test(t)});throw Error("Browser's test function is not valid")});return t&&(this.parsedResult.os=t.describe(this.getUA())),this.parsedResult.os},t.getOSName=function(e){var t=this.getOS().name;return e?String(t).toLowerCase()||"":t||""},t.getOSVersion=function(){return this.getOS().version},t.getPlatform=function(){return this.parsedResult.platform?this.parsedResult.platform:this.parsePlatform()},t.getPlatformType=function(e){void 0===e&&(e=!1);var t=this.getPlatform().type;return e?String(t).toLowerCase()||"":t||""},t.parsePlatform=function(){var e=this;this.parsedResult.platform={};var t=a.default.find(s.default,function(t){if("function"==typeof t.test)return t.test(e);if(t.test instanceof Array)return t.test.some(function(t){return e.test(t)});throw Error("Browser's test function is not valid")});return t&&(this.parsedResult.platform=t.describe(this.getUA())),this.parsedResult.platform},t.getEngine=function(){return this.parsedResult.engine?this.parsedResult.engine:this.parseEngine()},t.getEngineName=function(e){return e?String(this.getEngine().name).toLowerCase()||"":this.getEngine().name||""},t.parseEngine=function(){var e=this;this.parsedResult.engine={};var t=a.default.find(o.default,function(t){if("function"==typeof t.test)return t.test(e);if(t.test instanceof Array)return t.test.some(function(t){return e.test(t)});throw Error("Browser's test function is not valid")});return t&&(this.parsedResult.engine=t.describe(this.getUA())),this.parsedResult.engine},t.parse=function(){return this.parseBrowser(),this.parseOS(),this.parsePlatform(),this.parseEngine(),this},t.getResult=function(){return a.default.assign({},this.parsedResult)},t.satisfies=function(e){var t=this,r={},i=0,n={},s=0;if(Object.keys(e).forEach(function(t){var o=e[t];"string"==typeof o?(n[t]=o,s+=1):"object"==typeof o&&(r[t]=o,i+=1)}),i>0){var o=Object.keys(r),l=a.default.find(o,function(e){return t.isOS(e)});if(l){var d=this.satisfies(r[l]);if(void 0!==d)return d}var c=a.default.find(o,function(e){return t.isPlatform(e)});if(c){var u=this.satisfies(r[c]);if(void 0!==u)return u}}if(s>0){var h=Object.keys(n),p=a.default.find(h,function(e){return t.isBrowser(e,!0)});if(void 0!==p)return this.compareVersion(n[p])}},t.isBrowser=function(e,t){void 0===t&&(t=!1);var r=this.getBrowserName().toLowerCase(),i=e.toLowerCase(),n=a.default.getBrowserTypeByAlias(i);return t&&n&&(i=n.toLowerCase()),i===r},t.compareVersion=function(e){var t=[0],r=e,i=!1,n=this.getBrowserVersion();if("string"==typeof n)return">"===e[0]||"<"===e[0]?(r=e.substr(1),"="===e[1]?(i=!0,r=e.substr(2)):t=[],">"===e[0]?t.push(1):t.push(-1)):"="===e[0]?r=e.substr(1):"~"===e[0]&&(i=!0,r=e.substr(1)),t.indexOf(a.default.compareVersions(n,r,i))>-1},t.isOS=function(e){return this.getOSName(!0)===String(e).toLowerCase()},t.isPlatform=function(e){return this.getPlatformType(!0)===String(e).toLowerCase()},t.isEngine=function(e){return this.getEngineName(!0)===String(e).toLowerCase()},t.is=function(e,t){return void 0===t&&(t=!1),this.isBrowser(e,t)||this.isOS(e)||this.isPlatform(e)},t.some=function(e){var t=this;return void 0===e&&(e=[]),e.some(function(e){return t.is(e)})},e}();t.default=d,e.exports=t.default},92:function(e,t,r){"use strict";t.__esModule=!0,t.default=void 0;var i,n=(i=r(17))&&i.__esModule?i:{default:i},s=/version\/(\d+(\.?_?\d+)+)/i,o=[{test:[/googlebot/i],describe:function(e){var t={name:"Googlebot"},r=n.default.getFirstMatch(/googlebot\/(\d+(\.\d+))/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/opera/i],describe:function(e){var t={name:"Opera"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/opr\/|opios/i],describe:function(e){var t={name:"Opera"},r=n.default.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/SamsungBrowser/i],describe:function(e){var t={name:"Samsung Internet for Android"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/Whale/i],describe:function(e){var t={name:"NAVER Whale Browser"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/MZBrowser/i],describe:function(e){var t={name:"MZ Browser"},r=n.default.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/focus/i],describe:function(e){var t={name:"Focus"},r=n.default.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/swing/i],describe:function(e){var t={name:"Swing"},r=n.default.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/coast/i],describe:function(e){var t={name:"Opera Coast"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/opt\/\d+(?:.?_?\d+)+/i],describe:function(e){var t={name:"Opera Touch"},r=n.default.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/yabrowser/i],describe:function(e){var t={name:"Yandex Browser"},r=n.default.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/ucbrowser/i],describe:function(e){var t={name:"UC Browser"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/Maxthon|mxios/i],describe:function(e){var t={name:"Maxthon"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/epiphany/i],describe:function(e){var t={name:"Epiphany"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/puffin/i],describe:function(e){var t={name:"Puffin"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/sleipnir/i],describe:function(e){var t={name:"Sleipnir"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/k-meleon/i],describe:function(e){var t={name:"K-Meleon"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/micromessenger/i],describe:function(e){var t={name:"WeChat"},r=n.default.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/qqbrowser/i],describe:function(e){var t={name:/qqbrowserlite/i.test(e)?"QQ Browser Lite":"QQ Browser"},r=n.default.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/msie|trident/i],describe:function(e){var t={name:"Internet Explorer"},r=n.default.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/\sedg\//i],describe:function(e){var t={name:"Microsoft Edge"},r=n.default.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/edg([ea]|ios)/i],describe:function(e){var t={name:"Microsoft Edge"},r=n.default.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/vivaldi/i],describe:function(e){var t={name:"Vivaldi"},r=n.default.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/seamonkey/i],describe:function(e){var t={name:"SeaMonkey"},r=n.default.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/sailfish/i],describe:function(e){var t={name:"Sailfish"},r=n.default.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i,e);return r&&(t.version=r),t}},{test:[/silk/i],describe:function(e){var t={name:"Amazon Silk"},r=n.default.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/phantom/i],describe:function(e){var t={name:"PhantomJS"},r=n.default.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/slimerjs/i],describe:function(e){var t={name:"SlimerJS"},r=n.default.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/blackberry|\bbb\d+/i,/rim\stablet/i],describe:function(e){var t={name:"BlackBerry"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/(web|hpw)[o0]s/i],describe:function(e){var t={name:"WebOS Browser"},r=n.default.getFirstMatch(s,e)||n.default.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/bada/i],describe:function(e){var t={name:"Bada"},r=n.default.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/tizen/i],describe:function(e){var t={name:"Tizen"},r=n.default.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/qupzilla/i],describe:function(e){var t={name:"QupZilla"},r=n.default.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/firefox|iceweasel|fxios/i],describe:function(e){var t={name:"Firefox"},r=n.default.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/electron/i],describe:function(e){var t={name:"Electron"},r=n.default.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/MiuiBrowser/i],describe:function(e){var t={name:"Miui"},r=n.default.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/chromium/i],describe:function(e){var t={name:"Chromium"},r=n.default.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i,e)||n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/chrome|crios|crmo/i],describe:function(e){var t={name:"Chrome"},r=n.default.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/GSA/i],describe:function(e){var t={name:"Google Search"},r=n.default.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:function(e){var t=!e.test(/like android/i),r=e.test(/android/i);return t&&r},describe:function(e){var t={name:"Android Browser"},r=n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/playstation 4/i],describe:function(e){var t={name:"PlayStation 4"},r=n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/safari|applewebkit/i],describe:function(e){var t={name:"Safari"},r=n.default.getFirstMatch(s,e);return r&&(t.version=r),t}},{test:[/.*/i],describe:function(e){var t=-1!==e.search("\\(")?/^(.*)\/(.*)[ \t]\((.*)/:/^(.*)\/(.*) /;return{name:n.default.getFirstMatch(t,e),version:n.default.getSecondMatch(t,e)}}}];t.default=o,e.exports=t.default},93:function(e,t,r){"use strict";t.__esModule=!0,t.default=void 0;var i,n=(i=r(17))&&i.__esModule?i:{default:i},s=r(18),o=[{test:[/Roku\/DVP/],describe:function(e){var t=n.default.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i,e);return{name:s.OS_MAP.Roku,version:t}}},{test:[/windows phone/i],describe:function(e){var t=n.default.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i,e);return{name:s.OS_MAP.WindowsPhone,version:t}}},{test:[/windows /i],describe:function(e){var t=n.default.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i,e),r=n.default.getWindowsVersionName(t);return{name:s.OS_MAP.Windows,version:t,versionName:r}}},{test:[/Macintosh(.*?) FxiOS(.*?)\//],describe:function(e){var t={name:s.OS_MAP.iOS},r=n.default.getSecondMatch(/(Version\/)(\d[\d.]+)/,e);return r&&(t.version=r),t}},{test:[/macintosh/i],describe:function(e){var t=n.default.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i,e).replace(/[_\s]/g,"."),r=n.default.getMacOSVersionName(t),i={name:s.OS_MAP.MacOS,version:t};return r&&(i.versionName=r),i}},{test:[/(ipod|iphone|ipad)/i],describe:function(e){var t=n.default.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i,e).replace(/[_\s]/g,".");return{name:s.OS_MAP.iOS,version:t}}},{test:function(e){var t=!e.test(/like android/i),r=e.test(/android/i);return t&&r},describe:function(e){var t=n.default.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i,e),r=n.default.getAndroidVersionName(t),i={name:s.OS_MAP.Android,version:t};return r&&(i.versionName=r),i}},{test:[/(web|hpw)[o0]s/i],describe:function(e){var t=n.default.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i,e),r={name:s.OS_MAP.WebOS};return t&&t.length&&(r.version=t),r}},{test:[/blackberry|\bbb\d+/i,/rim\stablet/i],describe:function(e){var t=n.default.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i,e)||n.default.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i,e)||n.default.getFirstMatch(/\bbb(\d+)/i,e);return{name:s.OS_MAP.BlackBerry,version:t}}},{test:[/bada/i],describe:function(e){var t=n.default.getFirstMatch(/bada\/(\d+(\.\d+)*)/i,e);return{name:s.OS_MAP.Bada,version:t}}},{test:[/tizen/i],describe:function(e){var t=n.default.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i,e);return{name:s.OS_MAP.Tizen,version:t}}},{test:[/linux/i],describe:function(){return{name:s.OS_MAP.Linux}}},{test:[/CrOS/],describe:function(){return{name:s.OS_MAP.ChromeOS}}},{test:[/PlayStation 4/],describe:function(e){var t=n.default.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i,e);return{name:s.OS_MAP.PlayStation4,version:t}}}];t.default=o,e.exports=t.default},94:function(e,t,r){"use strict";t.__esModule=!0,t.default=void 0;var i,n=(i=r(17))&&i.__esModule?i:{default:i},s=r(18),o=[{test:[/googlebot/i],describe:function(){return{type:"bot",vendor:"Google"}}},{test:[/huawei/i],describe:function(e){var t=n.default.getFirstMatch(/(can-l01)/i,e)&&"Nova",r={type:s.PLATFORMS_MAP.mobile,vendor:"Huawei"};return t&&(r.model=t),r}},{test:[/nexus\s*(?:7|8|9|10).*/i],describe:function(){return{type:s.PLATFORMS_MAP.tablet,vendor:"Nexus"}}},{test:[/ipad/i],describe:function(){return{type:s.PLATFORMS_MAP.tablet,vendor:"Apple",model:"iPad"}}},{test:[/Macintosh(.*?) FxiOS(.*?)\//],describe:function(){return{type:s.PLATFORMS_MAP.tablet,vendor:"Apple",model:"iPad"}}},{test:[/kftt build/i],describe:function(){return{type:s.PLATFORMS_MAP.tablet,vendor:"Amazon",model:"Kindle Fire HD 7"}}},{test:[/silk/i],describe:function(){return{type:s.PLATFORMS_MAP.tablet,vendor:"Amazon"}}},{test:[/tablet(?! pc)/i],describe:function(){return{type:s.PLATFORMS_MAP.tablet}}},{test:function(e){var t=e.test(/ipod|iphone/i),r=e.test(/like (ipod|iphone)/i);return t&&!r},describe:function(e){var t=n.default.getFirstMatch(/(ipod|iphone)/i,e);return{type:s.PLATFORMS_MAP.mobile,vendor:"Apple",model:t}}},{test:[/nexus\s*[0-6].*/i,/galaxy nexus/i],describe:function(){return{type:s.PLATFORMS_MAP.mobile,vendor:"Nexus"}}},{test:[/[^-]mobi/i],describe:function(){return{type:s.PLATFORMS_MAP.mobile}}},{test:function(e){return"blackberry"===e.getBrowserName(!0)},describe:function(){return{type:s.PLATFORMS_MAP.mobile,vendor:"BlackBerry"}}},{test:function(e){return"bada"===e.getBrowserName(!0)},describe:function(){return{type:s.PLATFORMS_MAP.mobile}}},{test:function(e){return"windows phone"===e.getBrowserName()},describe:function(){return{type:s.PLATFORMS_MAP.mobile,vendor:"Microsoft"}}},{test:function(e){var t=Number(String(e.getOSVersion()).split(".")[0]);return"android"===e.getOSName(!0)&&t>=3},describe:function(){return{type:s.PLATFORMS_MAP.tablet}}},{test:function(e){return"android"===e.getOSName(!0)},describe:function(){return{type:s.PLATFORMS_MAP.mobile}}},{test:function(e){return"macos"===e.getOSName(!0)},describe:function(){return{type:s.PLATFORMS_MAP.desktop,vendor:"Apple"}}},{test:function(e){return"windows"===e.getOSName(!0)},describe:function(){return{type:s.PLATFORMS_MAP.desktop}}},{test:function(e){return"linux"===e.getOSName(!0)},describe:function(){return{type:s.PLATFORMS_MAP.desktop}}},{test:function(e){return"playstation 4"===e.getOSName(!0)},describe:function(){return{type:s.PLATFORMS_MAP.tv}}},{test:function(e){return"roku"===e.getOSName(!0)},describe:function(){return{type:s.PLATFORMS_MAP.tv}}}];t.default=o,e.exports=t.default},95:function(e,t,r){"use strict";t.__esModule=!0,t.default=void 0;var i,n=(i=r(17))&&i.__esModule?i:{default:i},s=r(18),o=[{test:function(e){return"microsoft edge"===e.getBrowserName(!0)},describe:function(e){if(/\sedg\//i.test(e))return{name:s.ENGINE_MAP.Blink};var t=n.default.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i,e);return{name:s.ENGINE_MAP.EdgeHTML,version:t}}},{test:[/trident/i],describe:function(e){var t={name:s.ENGINE_MAP.Trident},r=n.default.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:function(e){return e.test(/presto/i)},describe:function(e){var t={name:s.ENGINE_MAP.Presto},r=n.default.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:function(e){var t=e.test(/gecko/i),r=e.test(/like gecko/i);return t&&!r},describe:function(e){var t={name:s.ENGINE_MAP.Gecko},r=n.default.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}},{test:[/(apple)?webkit\/537\.36/i],describe:function(){return{name:s.ENGINE_MAP.Blink}}},{test:[/(apple)?webkit/i],describe:function(e){var t={name:s.ENGINE_MAP.WebKit},r=n.default.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i,e);return r&&(t.version=r),t}}];t.default=o,e.exports=t.default}})},811:(e,t,r)=>{"use strict";r.d(t,{Z:()=>a});var i=r(/*! ../../node_modules/css-loader/dist/runtime/sourceMaps.js */230),n=r.n(i),s=r(/*! ../../node_modules/css-loader/dist/runtime/api.js */529),o=r.n(s)()(n());o.push([e.id,"html.tabby{--lumo-primary-text-color: #ccc;--lumo-base-color: #131d27;--lumo-body-text-color: #ccc;--lumo-tint-5pct: #131d27;--lumo-font-family: Source Sans Pro;--lumo-font-size-m: 0.875rem;--lumo-box-shadow-m: 0 0 1rem rgba(0, 0, 0, 0.25), 0 1px 1px rgba(0, 0, 0, 0.12)}","",{version:3,sources:["webpack://./src/styles.scss"],names:[],mappings:"AAEA,WACI,+BAAA,CACA,0BAAA,CACA,4BAAA,CACA,yBAAA,CACA,mCAAA,CACA,4BAAA,CACA,gFAAA",sourcesContent:['@import "../../tabby-core/src/theme.vars.scss";\n\nhtml.tabby {\n    --lumo-primary-text-color: #{$body-color};\n    --lumo-base-color: #{$body-bg};\n    --lumo-body-text-color: #{$body-color};\n    --lumo-tint-5pct: #{$body-bg};\n    --lumo-font-family: #{$font-family-sans-serif};\n    --lumo-font-size-m: #{$font-size-base};\n    --lumo-box-shadow-m: #{$dropdown-box-shadow};\n}\n'],sourceRoot:""}]);let a=o},545:(e,t,r)=>{var i=r(/*! !../../../node_modules/pug-runtime/index.js */757);function n(e){return'\n<div class="modal-body">\n  <div>{{options.message}}</div><small>{{options.detail}}</small>\n</div>\n<div class="modal-footer">\n  <div class="ms-auto"></div>\n  <button class="btn" *ngFor="let button of options.buttons; index as i" [autofocus]="i === options.defaultId" [class.btn-primary]="i === options.defaultId" [class.btn-secondary]="i !== options.defaultId" (click)="onButton(i)">{{button}}</button>\n</div>'}e.exports=n},757:(e,t,r)=>{"use strict";var i=Object.prototype.hasOwnProperty;function n(e,t){if(1==arguments.length){for(var r=e[0],i=1;i<e.length;i++)r=n(r,e[i]);return r}for(var s in t)if("class"===s){var o=e[s]||[];e[s]=(Array.isArray(o)?o:[o]).concat(t[s]||[])}else if("style"===s){var o=l(e[s]);o=o&&";"!==o[o.length-1]?o+";":o;var a=l(t[s]);a=a&&";"!==a[a.length-1]?a+";":a,e[s]=o+a}else e[s]=t[s];return e}function s(e,t){for(var r,i="",n="",s=Array.isArray(t),o=0;o<e.length;o++)(r=a(e[o]))&&(s&&t[o]&&(r=h(r)),i=i+n+r,n=" ");return i}function o(e){var t="",r="";for(var n in e)n&&e[n]&&i.call(e,n)&&(t=t+r+n,r=" ");return t}function a(e,t){return Array.isArray(e)?s(e,t):e&&"object"==typeof e?o(e):e||""}function l(e){if(!e)return"";if("object"!=typeof e)return e+"";var t="";for(var r in e)i.call(e,r)&&(t=t+r+":"+e[r]+";");return t}function d(e,t,r,i){if(!1===t||null==t||!t&&("class"===e||"style"===e))return"";if(!0===t)return" "+(i?e:e+'="'+e+'"');var n=typeof t;return(("object"===n||"function"===n)&&"function"==typeof t.toJSON&&(t=t.toJSON()),"string"==typeof t||(t=JSON.stringify(t),r||-1===t.indexOf('"')))?(r&&(t=h(t))," "+e+'="'+t+'"'):" "+e+"='"+t.replace(/'/g,"&#39;")+"'"}function c(e,t){var r="";for(var n in e)if(i.call(e,n)){var s=e[n];if("class"===n){r=d(n,s=a(s),!1,t)+r;continue}"style"===n&&(s=l(s)),r+=d(n,s,!1,t)}return r}t.merge=n,t.classes=a,t.style=l,t.attr=d,t.attrs=c;var u=/["&<>]/;function h(e){var t,r,i,n=""+e,s=u.exec(n);if(!s)return e;var o="";for(t=s.index,r=0;t<n.length;t++){switch(n.charCodeAt(t)){case 34:i="&quot;";break;case 38:i="&amp;";break;case 60:i="&lt;";break;case 62:i="&gt;";break;default:continue}r!==t&&(o+=n.substring(r,t)),r=t+1,o+=i}return r!==t?o+n.substring(r,t):o}function p(e,t,i,n){var s,o,a,l;if(!(e instanceof Error))throw e;if(("undefined"!=typeof window||!t)&&!n)throw e.message+=" on line "+i,e;try{n=n||r(/*! fs */89).readFileSync(t,{encoding:"utf8"}),s=3,o=n.split("\n"),a=Math.max(i-s,0),l=Math.min(o.length,i+s)}catch(r){e.message+=" - could not read from "+t+" ("+r.message+")",p(e,null,i);return}s=o.slice(a,l).map(function(e,t){var r=t+a+1;return(r==i?"  > ":"    ")+r+"| "+e}).join("\n"),e.path=t;try{e.message=(t||"Pug")+":"+i+"\n"+s+"\n\n"+e.message}catch(e){}throw e}t.escape=h,t.rethrow=p},78:e=>{"use strict";var t=[];function r(e){for(var r=-1,i=0;i<t.length;i++)if(t[i].identifier===e){r=i;break}return r}function i(e,i){for(var s={},o=[],a=0;a<e.length;a++){var l=e[a],d=i.base?l[0]+i.base:l[0],c=s[d]||0,u="".concat(d," ").concat(c);s[d]=c+1;var h=r(u),p={css:l[1],media:l[2],sourceMap:l[3],supports:l[4],layer:l[5]};if(-1!==h)t[h].references++,t[h].updater(p);else{var m=n(p,i);i.byIndex=a,t.splice(a,0,{identifier:u,updater:m,references:1})}o.push(u)}return o}function n(e,t){var r=t.domAPI(t);return r.update(e),function(t){t?(t.css!==e.css||t.media!==e.media||t.sourceMap!==e.sourceMap||t.supports!==e.supports||t.layer!==e.layer)&&r.update(e=t):r.remove()}}e.exports=function(e,n){var s=i(e=e||[],n=n||{});return function(e){e=e||[];for(var o=0;o<s.length;o++){var a=r(s[o]);t[a].references--}for(var l=i(e,n),d=0;d<s.length;d++){var c=r(s[d]);0===t[c].references&&(t[c].updater(),t.splice(c,1))}s=l}}},127:e=>{"use strict";var t={};function r(e){if(void 0===t[e]){var r=document.querySelector(e);if(window.HTMLIFrameElement&&r instanceof window.HTMLIFrameElement)try{r=r.contentDocument.head}catch(e){r=null}t[e]=r}return t[e]}function i(e,t){var i=r(e);if(!i)throw Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");i.appendChild(t)}e.exports=i},687:e=>{"use strict";function t(e){var t=document.createElement("style");return e.setAttributes(t,e.attributes),e.insert(t,e.options),t}e.exports=t},686:(e,t,r)=>{"use strict";function i(e){var t=r.nc;t&&e.setAttribute("nonce",t)}e.exports=i},922:e=>{"use strict";function t(e,t,r){var i="";r.supports&&(i+="@supports (".concat(r.supports,") {")),r.media&&(i+="@media ".concat(r.media," {"));var n=void 0!==r.layer;n&&(i+="@layer".concat(r.layer.length>0?" ".concat(r.layer):""," {")),i+=r.css,n&&(i+="}"),r.media&&(i+="}"),r.supports&&(i+="}");var s=r.sourceMap;s&&"undefined"!=typeof btoa&&(i+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(s))))," */")),t.styleTagTransform(i,e,t.options)}function r(e){if(null===e.parentNode)return!1;e.parentNode.removeChild(e)}function i(e){var i=e.insertStyleElement(e);return{update:function(r){t(i,e,r)},remove:function(){r(i)}}}e.exports=i},500:e=>{"use strict";function t(e,t){if(t.styleSheet)t.styleSheet.cssText=e;else{for(;t.firstChild;)t.removeChild(t.firstChild);t.appendChild(document.createTextNode(e))}}e.exports=t},848:e=>{"use strict";e.exports=t},900:t=>{"use strict";t.exports=e},571:e=>{"use strict";e.exports=i},89:e=>{"use strict";if(void 0===n){var t=Error("Cannot find module 'fs'");throw t.code="MODULE_NOT_FOUND",t}e.exports=n},315:e=>{"use strict";e.exports=r}},o={};function a(e){var t=o[e];if(void 0!==t)return t.exports;var r=o[e]={id:e,exports:{}};return s[e].call(r.exports,r,r.exports,a),r.exports}a.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return a.d(t,{a:t}),t},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),a.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.nc=void 0;var l={};return(()=>{"use strict";let e,t,r,i,n,s,o,d;/*!************************************!*\
  !*** ./src/index.ts + 123 modules ***!
  \************************************/a.r(l),a.d(l,{default:()=>aH});var c=function(e,t){return(Object.setPrototypeOf||({__proto__:[]})instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r])})(e,t)},u=function(){return(Object.assign||function(e){for(var t,r=1,i=arguments.length;r<i;r++)for(var n in t=arguments[r])Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);return e}).apply(this,arguments)};function h(e,t,r,i){var n,s=arguments.length,o=s<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,r,i);else for(var a=e.length-1;a>=0;a--)(n=e[a])&&(o=(s<3?n(o):s>3?n(t,r,o):n(t,r))||o);return s>3&&o&&Object.defineProperty(t,r,o),o}function p(e,t){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(e,t)}function m(e,t,r,i){return new(r||(r=Promise))(function(n,s){function o(e){try{l(i.next(e))}catch(e){s(e)}}function a(e){try{l(i.throw(e))}catch(e){s(e)}}function l(e){var t;e.done?n(e.value):((t=e.value)instanceof r?t:new r(function(e){e(t)})).then(o,a)}l((i=i.apply(e,t||[])).next())})}var f=Object.create?function(e,t,r,i){void 0===i&&(i=r);var n=Object.getOwnPropertyDescriptor(t,r);(!n||("get"in n?!t.__esModule:n.writable||n.configurable))&&(n={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,i,n)}:function(e,t,r,i){void 0===i&&(i=r),e[i]=t[r]},_=Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t},y=a(900),g=a(848),v=a(315);/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/window.JSCompiler_renameProperty=function(e,t){return e};/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let b=/(url\()([^)]*)(\))/g,w=/(^\/[^\/])|(^#)|(^[\w-\d]*:)/;function S(r,i){if(r&&w.test(r)||"//"===r)return r;if(void 0===e){e=!1;try{let t=new URL("b","http://a");t.pathname="c%20d",e="http://a/c%20d"===t.href}catch(e){}}if(i||(i=document.baseURI||window.location.href),e)try{return new URL(r,i).href}catch(e){return r}return t||((t=document.implementation.createHTMLDocument("temp")).base=t.createElement("base"),t.head.appendChild(t.base),t.anchor=t.createElement("a"),t.body.appendChild(t.anchor)),t.base.href=i,t.anchor.href=r,t.anchor.href||r}function C(e,t){return e.replace(b,function(e,r,i,n){return r+"'"+S(i.replace(/["']/g,""),t)+"'"+n})}function A(e){return e.substring(0,e.lastIndexOf("/")+1)}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let P=!window.ShadyDOM||!window.ShadyDOM.inUse;window.ShadyCSS&&window.ShadyCSS.nativeCss,window.customElements.polyfillWrapFlushCallback;let x=P&&"adoptedStyleSheets"in Document.prototype&&"replaceSync"in CSSStyleSheet.prototype&&(()=>{try{let e=new CSSStyleSheet;e.replaceSync("");let t=document.createElement("div");return t.attachShadow({mode:"open"}),t.shadowRoot.adoptedStyleSheets=[e],t.shadowRoot.adoptedStyleSheets[0]===e}catch(e){return!1}})(),E=window.Polymer&&window.Polymer.rootPath||A(document.baseURI||window.location.href),O=window.Polymer&&window.Polymer.sanitizeDOMValue||void 0,T=window.Polymer&&window.Polymer.setPassiveTouchGestures||!1,M=window.Polymer&&window.Polymer.strictTemplatePolicy||!1,N=window.Polymer&&window.Polymer.allowTemplateFromDomModule||!1,k=window.Polymer&&window.Polymer.legacyOptimizations||!1,I=window.Polymer&&window.Polymer.legacyWarnings||!1,L=window.Polymer&&window.Polymer.syncInitialRender||!1,R=window.Polymer&&window.Polymer.legacyUndefined||!1,F=window.Polymer&&window.Polymer.orderedComputed||!1,D=!0,z=window.Polymer&&window.Polymer.removeNestedTemplates||!1,B=window.Polymer&&window.Polymer.fastDomIf||!1,j=window.Polymer&&window.Polymer.suppressTemplateNotifications||!1,H=window.Polymer&&window.Polymer.legacyNoObservedAttributes||!1,U=window.Polymer&&window.Polymer.useAdoptedStyleSheetsWithBuiltCSS||!1,q={},V={};function W(e,t){q[e]=V[e.toLowerCase()]=t}function Y(e){return q[e]||V[e.toLowerCase()]}function G(e){e.querySelector("style")&&console.warn("dom-module %s has style outside template",e.id)}class J extends HTMLElement{static get observedAttributes(){return["id"]}static import(e,t){if(e){let r=Y(e);return r&&t?r.querySelector(t):r}return null}attributeChangedCallback(e,t,r,i){t!==r&&this.register()}get assetpath(){if(!this.__assetpath){let e=window.HTMLImports&&HTMLImports.importForElement?HTMLImports.importForElement(this)||document:this.ownerDocument,t=S(this.getAttribute("assetpath")||"",e.baseURI);this.__assetpath=A(t)}return this.__assetpath}register(e){if(e=e||this.id){if(M&&void 0!==Y(e))throw W(e,null),Error(`strictTemplatePolicy: dom-module ${e} re-registered`);this.id=e,W(e,this),G(this)}}}J.prototype.modules=q,customElements.define("dom-module",J);/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */let $="undefined"!=typeof window&&null!=window.customElements&&void 0!==window.customElements.polyfillWrapFlushCallback,X=(e,t,r=null)=>{for(;t!==r;){let r=t.nextSibling;e.removeChild(t),t=r}},Z=`{{lit-${String(Math.random()).slice(2)}}}`,K=`<!--${Z}-->`,Q=RegExp(`${Z}|${K}`),ee="$lit$";class et{constructor(e,t){this.parts=[],this.element=t;let r=[],i=[],n=document.createTreeWalker(t.content,133,null,!1),s=0,o=-1,a=0,{strings:l,values:{length:d}}=e;for(;a<d;){let e=n.nextNode();if(null===e){n.currentNode=i.pop();continue}if(o++,1===e.nodeType){if(e.hasAttributes()){let t=e.attributes,{length:r}=t,i=0;for(let e=0;e<r;e++)er(t[e].name,ee)&&i++;for(;i-- >0;){let t=l[a],r=es.exec(t)[2],i=r.toLowerCase()+ee,n=e.getAttribute(i);e.removeAttribute(i);let s=n.split(Q);this.parts.push({type:"attribute",index:o,name:r,strings:s}),a+=s.length-1}}"TEMPLATE"===e.tagName&&(i.push(e),n.currentNode=e.content)}else if(3===e.nodeType){let t=e.data;if(t.indexOf(Z)>=0){let i=e.parentNode,n=t.split(Q),s=n.length-1;for(let t=0;t<s;t++){let r;let s=n[t];if(""===s)r=en();else{let e=es.exec(s);null!==e&&er(e[2],ee)&&(s=s.slice(0,e.index)+e[1]+e[2].slice(0,-ee.length)+e[3]),r=document.createTextNode(s)}i.insertBefore(r,e),this.parts.push({type:"node",index:++o})}""===n[s]?(i.insertBefore(en(),e),r.push(e)):e.data=n[s],a+=s}}else if(8===e.nodeType){if(e.data===Z){let t=e.parentNode;(null===e.previousSibling||o===s)&&(o++,t.insertBefore(en(),e)),s=o,this.parts.push({type:"node",index:o}),null===e.nextSibling?e.data="":(r.push(e),o--),a++}else{let t=-1;for(;-1!==(t=e.data.indexOf(Z,t+1));)this.parts.push({type:"node",index:-1}),a++}}}for(let e of r)e.parentNode.removeChild(e)}}let er=(e,t)=>{let r=e.length-t.length;return r>=0&&e.slice(r)===t},ei=e=>-1!==e.index,en=()=>document.createComment(""),es=/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;function eo(e,t){let{element:{content:r},parts:i}=e,n=document.createTreeWalker(r,133,null,!1),s=el(i),o=i[s],a=-1,l=0,d=[],c=null;for(;n.nextNode();){a++;let e=n.currentNode;for(e.previousSibling===c&&(c=null),t.has(e)&&(d.push(e),null===c&&(c=e)),null!==c&&l++;void 0!==o&&o.index===a;)o.index=null!==c?-1:o.index-l,s=el(i,s),o=i[s]}d.forEach(e=>e.parentNode.removeChild(e))}let ea=e=>{let t=11===e.nodeType?0:1,r=document.createTreeWalker(e,133,null,!1);for(;r.nextNode();)t++;return t},el=(e,t=-1)=>{for(let r=t+1;r<e.length;r++){let t=e[r];if(ei(t))return r}return -1};function ed(e,t,r=null){let{element:{content:i},parts:n}=e;if(null==r){i.appendChild(t);return}let s=document.createTreeWalker(i,133,null,!1),o=el(n),a=0,l=-1;for(;s.nextNode();){l++;let e=s.currentNode;for(e===r&&(a=ea(t),r.parentNode.insertBefore(t,r));-1!==o&&n[o].index===l;){if(a>0){for(;-1!==o;)n[o].index+=a,o=el(n,o);return}o=el(n,o)}}}/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */let ec=new WeakMap,eu=e=>"function"==typeof e&&ec.has(e),eh={},ep={};/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */class em{constructor(e,t,r){this.__parts=[],this.template=e,this.processor=t,this.options=r}update(e){let t=0;for(let r of this.__parts)void 0!==r&&r.setValue(e[t]),t++;for(let e of this.__parts)void 0!==e&&e.commit()}_clone(){let e;let t=$?this.template.element.content.cloneNode(!0):document.importNode(this.template.element.content,!0),r=[],i=this.template.parts,n=document.createTreeWalker(t,133,null,!1),s=0,o=0,a=n.nextNode();for(;s<i.length;){if(!ei(e=i[s])){this.__parts.push(void 0),s++;continue}for(;o<e.index;)o++,"TEMPLATE"===a.nodeName&&(r.push(a),n.currentNode=a.content),null===(a=n.nextNode())&&(n.currentNode=r.pop(),a=n.nextNode());if("node"===e.type){let e=this.processor.handleTextExpression(this.options);e.insertAfterNode(a.previousSibling),this.__parts.push(e)}else this.__parts.push(...this.processor.handleAttributeExpressions(a,e.name,e.strings,this.options));s++}return $&&(document.adoptNode(t),customElements.upgrade(t)),t}}/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */let ef=window.trustedTypes&&trustedTypes.createPolicy("lit-html",{createHTML:e=>e}),e_=` ${Z} `;class ey{constructor(e,t,r,i){this.strings=e,this.values=t,this.type=r,this.processor=i}getHTML(){let e=this.strings.length-1,t="",r=!1;for(let i=0;i<e;i++){let e=this.strings[i],n=e.lastIndexOf("<!--");r=(n>-1||r)&&-1===e.indexOf("-->",n+1);let s=es.exec(e);null===s?t+=e+(r?e_:K):t+=e.substr(0,s.index)+s[1]+s[2]+ee+s[3]+Z}return t+this.strings[e]}getTemplateElement(){let e=document.createElement("template"),t=this.getHTML();return void 0!==ef&&(t=ef.createHTML(t)),e.innerHTML=t,e}}/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */let eg=e=>null===e||!("object"==typeof e||"function"==typeof e),ev=e=>Array.isArray(e)||!!(e&&e[Symbol.iterator]);class eb{constructor(e,t,r){this.dirty=!0,this.element=e,this.name=t,this.strings=r,this.parts=[];for(let e=0;e<r.length-1;e++)this.parts[e]=this._createPart()}_createPart(){return new ew(this)}_getValue(){let e=this.strings,t=e.length-1,r=this.parts;if(1===t&&""===e[0]&&""===e[1]){let e=r[0].value;if("symbol"==typeof e)return String(e);if("string"==typeof e||!ev(e))return e}let i="";for(let n=0;n<t;n++){i+=e[n];let t=r[n];if(void 0!==t){let e=t.value;if(eg(e)||!ev(e))i+="string"==typeof e?e:String(e);else for(let t of e)i+="string"==typeof t?t:String(t)}}return i+e[t]}commit(){this.dirty&&(this.dirty=!1,this.element.setAttribute(this.name,this._getValue()))}}class ew{constructor(e){this.value=void 0,this.committer=e}setValue(e){e===eh||eg(e)&&e===this.value||(this.value=e,eu(e)||(this.committer.dirty=!0))}commit(){for(;eu(this.value);){let e=this.value;this.value=eh,e(this)}this.value!==eh&&this.committer.commit()}}class eS{constructor(e){this.value=void 0,this.__pendingValue=void 0,this.options=e}appendInto(e){this.startNode=e.appendChild(en()),this.endNode=e.appendChild(en())}insertAfterNode(e){this.startNode=e,this.endNode=e.nextSibling}appendIntoPart(e){e.__insert(this.startNode=en()),e.__insert(this.endNode=en())}insertAfterPart(e){e.__insert(this.startNode=en()),this.endNode=e.endNode,e.endNode=this.startNode}setValue(e){this.__pendingValue=e}commit(){if(null===this.startNode.parentNode)return;for(;eu(this.__pendingValue);){let e=this.__pendingValue;this.__pendingValue=eh,e(this)}let e=this.__pendingValue;e!==eh&&(eg(e)?e!==this.value&&this.__commitText(e):e instanceof ey?this.__commitTemplateResult(e):e instanceof Node?this.__commitNode(e):ev(e)?this.__commitIterable(e):e===ep?(this.value=ep,this.clear()):this.__commitText(e))}__insert(e){this.endNode.parentNode.insertBefore(e,this.endNode)}__commitNode(e){this.value!==e&&(this.clear(),this.__insert(e),this.value=e)}__commitText(e){let t=this.startNode.nextSibling;e=null==e?"":e;let r="string"==typeof e?e:String(e);t===this.endNode.previousSibling&&3===t.nodeType?t.data=r:this.__commitNode(document.createTextNode(r)),this.value=e}__commitTemplateResult(e){let t=this.options.templateFactory(e);if(this.value instanceof em&&this.value.template===t)this.value.update(e.values);else{let r=new em(t,e.processor,this.options),i=r._clone();r.update(e.values),this.__commitNode(i),this.value=r}}__commitIterable(e){let t;Array.isArray(this.value)||(this.value=[],this.clear());let r=this.value,i=0;for(let n of e)void 0===(t=r[i])&&(t=new eS(this.options),r.push(t),0===i?t.appendIntoPart(this):t.insertAfterPart(r[i-1])),t.setValue(n),t.commit(),i++;i<r.length&&(r.length=i,this.clear(t&&t.endNode))}clear(e=this.startNode){X(this.startNode.parentNode,e.nextSibling,this.endNode)}}class eC{constructor(e,t,r){if(this.value=void 0,this.__pendingValue=void 0,2!==r.length||""!==r[0]||""!==r[1])throw Error("Boolean attributes can only contain a single expression");this.element=e,this.name=t,this.strings=r}setValue(e){this.__pendingValue=e}commit(){for(;eu(this.__pendingValue);){let e=this.__pendingValue;this.__pendingValue=eh,e(this)}if(this.__pendingValue===eh)return;let e=!!this.__pendingValue;this.value!==e&&(e?this.element.setAttribute(this.name,""):this.element.removeAttribute(this.name),this.value=e),this.__pendingValue=eh}}class eA extends eb{constructor(e,t,r){super(e,t,r),this.single=2===r.length&&""===r[0]&&""===r[1]}_createPart(){return new eP(this)}_getValue(){return this.single?this.parts[0].value:super._getValue()}commit(){this.dirty&&(this.dirty=!1,this.element[this.name]=this._getValue())}}class eP extends ew{}let ex=!1;(()=>{try{let e={get capture(){return ex=!0,!1}};window.addEventListener("test",e,e),window.removeEventListener("test",e,e)}catch(e){}})();class eE{constructor(e,t,r){this.value=void 0,this.__pendingValue=void 0,this.element=e,this.eventName=t,this.eventContext=r,this.__boundHandleEvent=e=>this.handleEvent(e)}setValue(e){this.__pendingValue=e}commit(){for(;eu(this.__pendingValue);){let e=this.__pendingValue;this.__pendingValue=eh,e(this)}if(this.__pendingValue===eh)return;let e=this.__pendingValue,t=this.value,r=null==e||null!=t&&(e.capture!==t.capture||e.once!==t.once||e.passive!==t.passive);r&&this.element.removeEventListener(this.eventName,this.__boundHandleEvent,this.__options),null!=e&&(null==t||r)&&(this.__options=eO(e),this.element.addEventListener(this.eventName,this.__boundHandleEvent,this.__options)),this.value=e,this.__pendingValue=eh}handleEvent(e){"function"==typeof this.value?this.value.call(this.eventContext||this.element,e):this.value.handleEvent(e)}}let eO=e=>e&&(ex?{capture:e.capture,passive:e.passive,once:e.once}:e.capture);/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */function eT(e){let t=eM.get(e.type);void 0===t&&(t={stringsArray:new WeakMap,keyString:new Map},eM.set(e.type,t));let r=t.stringsArray.get(e.strings);if(void 0!==r)return r;let i=e.strings.join(Z);return void 0===(r=t.keyString.get(i))&&(r=new et(e,e.getTemplateElement()),t.keyString.set(i,r)),t.stringsArray.set(e.strings,r),r}let eM=new Map,eN=new WeakMap,ek=(e,t,r)=>{let i=eN.get(t);void 0===i&&(X(t,t.firstChild),eN.set(t,i=new eS(Object.assign({templateFactory:eT},r))),i.appendInto(t)),i.setValue(e),i.commit()};/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */class eI{handleAttributeExpressions(e,t,r,i){let n=t[0];if("."===n){let i=new eA(e,t.slice(1),r);return i.parts}if("@"===n)return[new eE(e,t.slice(1),i.eventContext)];if("?"===n)return[new eC(e,t.slice(1),r)];let s=new eb(e,t,r);return s.parts}handleTextExpression(e){return new eS(e)}}new eI,"undefined"!=typeof window&&(window.litHtmlVersions||(window.litHtmlVersions=[])).push("1.4.1");/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */let eL=(e,t)=>`${e}--${t}`,eR=!0;void 0===window.ShadyCSS?eR=!1:void 0===window.ShadyCSS.prepareTemplateDom&&(console.warn("Incompatible ShadyCSS version detected. Please update to at least @webcomponents/webcomponentsjs@2.0.2 and @webcomponents/shadycss@1.3.1."),eR=!1);let eF=e=>t=>{let r=eL(t.type,e),i=eM.get(r);void 0===i&&(i={stringsArray:new WeakMap,keyString:new Map},eM.set(r,i));let n=i.stringsArray.get(t.strings);if(void 0!==n)return n;let s=t.strings.join(Z);if(void 0===(n=i.keyString.get(s))){let r=t.getTemplateElement();eR&&window.ShadyCSS.prepareTemplateDom(r,e),n=new et(t,r),i.keyString.set(s,n)}return i.stringsArray.set(t.strings,n),n},eD=["html","svg"],ez=e=>{eD.forEach(t=>{let r=eM.get(eL(t,e));void 0!==r&&r.keyString.forEach(e=>{let{element:{content:t}}=e,r=new Set;Array.from(t.querySelectorAll("style")).forEach(e=>{r.add(e)}),eo(e,r)})})},eB=new Set,ej=(e,t,r)=>{eB.add(e);let i=r?r.element:document.createElement("template"),n=t.querySelectorAll("style"),{length:s}=n;if(0===s){window.ShadyCSS.prepareTemplateStyles(i,e);return}let o=document.createElement("style");for(let e=0;e<s;e++){let t=n[e];t.parentNode.removeChild(t),o.textContent+=t.textContent}ez(e);let a=i.content;r?ed(r,o,a.firstChild):a.insertBefore(o,a.firstChild),window.ShadyCSS.prepareTemplateStyles(i,e);let l=a.querySelector("style");if(window.ShadyCSS.nativeShadow&&null!==l)t.insertBefore(l.cloneNode(!0),t.firstChild);else if(r){a.insertBefore(o,a.firstChild);let e=new Set;e.add(o),eo(r,e)}},eH=(e,t,r)=>{if(!r||"object"!=typeof r||!r.scopeName)throw Error("The `scopeName` option is required.");let i=r.scopeName,n=eN.has(t),s=eR&&11===t.nodeType&&!!t.host,o=s&&!eB.has(i),a=o?document.createDocumentFragment():t;if(ek(e,a,Object.assign({templateFactory:eF(i)},r)),o){let e=eN.get(a);eN.delete(a);let r=e.value instanceof em?e.value.template:void 0;ej(i,a,r),X(t,t.firstChild),t.appendChild(a),eN.set(t,e)}!n&&s&&window.ShadyCSS.styleElement(t.host)};window.JSCompiler_renameProperty=(e,t)=>e;let eU={toAttribute(e,t){switch(t){case Boolean:return e?"":null;case Object:case Array:return null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){switch(t){case Boolean:return null!==e;case Number:return null===e?null:Number(e);case Object:case Array:return JSON.parse(e)}return e}},eq=(e,t)=>t!==e&&(t==t||e==e),eV={attribute:!0,type:String,converter:eU,reflect:!1,hasChanged:eq},eW="finalized";class eY extends HTMLElement{constructor(){super(),this.initialize()}static get observedAttributes(){this.finalize();let e=[];return this._classProperties.forEach((t,r)=>{let i=this._attributeNameForProperty(r,t);void 0!==i&&(this._attributeToPropertyMap.set(i,r),e.push(i))}),e}static _ensureClassProperties(){if(!this.hasOwnProperty(JSCompiler_renameProperty("_classProperties",this))){this._classProperties=new Map;let e=Object.getPrototypeOf(this)._classProperties;void 0!==e&&e.forEach((e,t)=>this._classProperties.set(t,e))}}static createProperty(e,t=eV){if(this._ensureClassProperties(),this._classProperties.set(e,t),t.noAccessor||this.prototype.hasOwnProperty(e))return;let r="symbol"==typeof e?Symbol():`__${e}`,i=this.getPropertyDescriptor(e,r,t);void 0!==i&&Object.defineProperty(this.prototype,e,i)}static getPropertyDescriptor(e,t,r){return{get(){return this[t]},set(i){let n=this[e];this[t]=i,this.requestUpdateInternal(e,n,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this._classProperties&&this._classProperties.get(e)||eV}static finalize(){let e=Object.getPrototypeOf(this);if(e.hasOwnProperty(eW)||e.finalize(),this[eW]=!0,this._ensureClassProperties(),this._attributeToPropertyMap=new Map,this.hasOwnProperty(JSCompiler_renameProperty("properties",this))){let e=this.properties,t=[...Object.getOwnPropertyNames(e),..."function"==typeof Object.getOwnPropertySymbols?Object.getOwnPropertySymbols(e):[]];for(let r of t)this.createProperty(r,e[r])}}static _attributeNameForProperty(e,t){let r=t.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof e?e.toLowerCase():void 0}static _valueHasChanged(e,t,r=eq){return r(e,t)}static _propertyValueFromAttribute(e,t){let r=t.type,i=t.converter||eU,n="function"==typeof i?i:i.fromAttribute;return n?n(e,r):e}static _propertyValueToAttribute(e,t){if(void 0===t.reflect)return;let r=t.type,i=t.converter,n=i&&i.toAttribute||eU.toAttribute;return n(e,r)}initialize(){this._updateState=0,this._updatePromise=new Promise(e=>this._enableUpdatingResolver=e),this._changedProperties=new Map,this._saveInstanceProperties(),this.requestUpdateInternal()}_saveInstanceProperties(){this.constructor._classProperties.forEach((e,t)=>{if(this.hasOwnProperty(t)){let e=this[t];delete this[t],this._instanceProperties||(this._instanceProperties=new Map),this._instanceProperties.set(t,e)}})}_applyInstanceProperties(){this._instanceProperties.forEach((e,t)=>this[t]=e),this._instanceProperties=void 0}connectedCallback(){this.enableUpdating()}enableUpdating(){void 0!==this._enableUpdatingResolver&&(this._enableUpdatingResolver(),this._enableUpdatingResolver=void 0)}disconnectedCallback(){}attributeChangedCallback(e,t,r){t!==r&&this._attributeToProperty(e,r)}_propertyToAttribute(e,t,r=eV){let i=this.constructor,n=i._attributeNameForProperty(e,r);if(void 0!==n){let e=i._propertyValueToAttribute(t,r);if(void 0===e)return;this._updateState=8|this._updateState,null==e?this.removeAttribute(n):this.setAttribute(n,e),this._updateState=-9&this._updateState}}_attributeToProperty(e,t){if(8&this._updateState)return;let r=this.constructor,i=r._attributeToPropertyMap.get(e);if(void 0!==i){let e=r.getPropertyOptions(i);this._updateState=16|this._updateState,this[i]=r._propertyValueFromAttribute(t,e),this._updateState=-17&this._updateState}}requestUpdateInternal(e,t,r){let i=!0;if(void 0!==e){let n=this.constructor;r=r||n.getPropertyOptions(e),n._valueHasChanged(this[e],t,r.hasChanged)?(this._changedProperties.has(e)||this._changedProperties.set(e,t),!0!==r.reflect||16&this._updateState||(void 0===this._reflectingProperties&&(this._reflectingProperties=new Map),this._reflectingProperties.set(e,r))):i=!1}!this._hasRequestedUpdate&&i&&(this._updatePromise=this._enqueueUpdate())}requestUpdate(e,t){return this.requestUpdateInternal(e,t),this.updateComplete}async _enqueueUpdate(){this._updateState=4|this._updateState;try{await this._updatePromise}catch(e){}let e=this.performUpdate();return null!=e&&await e,!this._hasRequestedUpdate}get _hasRequestedUpdate(){return 4&this._updateState}get hasUpdated(){return 1&this._updateState}performUpdate(){if(!this._hasRequestedUpdate)return;this._instanceProperties&&this._applyInstanceProperties();let e=!1,t=this._changedProperties;try{(e=this.shouldUpdate(t))?this.update(t):this._markUpdated()}catch(t){throw e=!1,this._markUpdated(),t}e&&(1&this._updateState||(this._updateState=1|this._updateState,this.firstUpdated(t)),this.updated(t))}_markUpdated(){this._changedProperties=new Map,this._updateState=-5&this._updateState}get updateComplete(){return this._getUpdateComplete()}_getUpdateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._updatePromise}shouldUpdate(e){return!0}update(e){void 0!==this._reflectingProperties&&this._reflectingProperties.size>0&&(this._reflectingProperties.forEach((e,t)=>this._propertyToAttribute(t,this[t],e)),this._reflectingProperties=void 0),this._markUpdated()}updated(e){}firstUpdated(e){}}eY[eW]=!0;let eG=Element.prototype,eJ=(eG.msMatchesSelector||eG.webkitMatchesSelector,window.ShadowRoot&&(void 0===window.ShadyCSS||window.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype),e$=Symbol();class eX{constructor(e,t){if(t!==e$)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e}get styleSheet(){return void 0===this._styleSheet&&(eJ?(this._styleSheet=new CSSStyleSheet,this._styleSheet.replaceSync(this.cssText)):this._styleSheet=null),this._styleSheet}toString(){return this.cssText}}let eZ=e=>new eX(String(e),e$),eK=e=>{if(e instanceof eX)return e.cssText;if("number"==typeof e)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: ${e}. Use 'unsafeCSS' to pass non-literal values, but
            take care to ensure page security.`)},eQ=(e,...t)=>{let r=t.reduce((t,r,i)=>t+eK(r)+e[i+1],e[0]);return new eX(r,e$)};/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */(window.litElementVersions||(window.litElementVersions=[])).push("2.5.1");let e0={};class e1 extends eY{static getStyles(){return this.styles}static _getUniqueStyles(){if(this.hasOwnProperty(JSCompiler_renameProperty("_styles",this)))return;let e=this.getStyles();if(Array.isArray(e)){let t=(e,r)=>e.reduceRight((e,r)=>Array.isArray(r)?t(r,e):(e.add(r),e),r),r=t(e,new Set),i=[];r.forEach(e=>i.unshift(e)),this._styles=i}else this._styles=void 0===e?[]:[e];this._styles=this._styles.map(e=>{if(e instanceof CSSStyleSheet&&!eJ){let t=Array.prototype.slice.call(e.cssRules).reduce((e,t)=>e+t.cssText,"");return eZ(t)}return e})}initialize(){super.initialize(),this.constructor._getUniqueStyles(),this.renderRoot=this.createRenderRoot(),window.ShadowRoot&&this.renderRoot instanceof window.ShadowRoot&&this.adoptStyles()}createRenderRoot(){return this.attachShadow(this.constructor.shadowRootOptions)}adoptStyles(){let e=this.constructor._styles;0!==e.length&&(void 0===window.ShadyCSS||window.ShadyCSS.nativeShadow?eJ?this.renderRoot.adoptedStyleSheets=e.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet):this._needsShimAdoptedStyleSheets=!0:window.ShadyCSS.ScopingShim.prepareAdoptedCssText(e.map(e=>e.cssText),this.localName))}connectedCallback(){super.connectedCallback(),this.hasUpdated&&void 0!==window.ShadyCSS&&window.ShadyCSS.styleElement(this)}update(e){let t=this.render();super.update(e),t!==e0&&this.constructor.render(t,this.renderRoot,{scopeName:this.localName,eventContext:this}),this._needsShimAdoptedStyleSheets&&(this._needsShimAdoptedStyleSheets=!1,this.constructor._styles.forEach(e=>{let t=document.createElement("style");t.textContent=e.cssText,this.renderRoot.appendChild(t)}))}render(){return e0}}e1.finalized=!0,e1.render=eH,e1.shadowRootOptions={mode:"open"};let e2=0,e4={},e5=(e,t,r)=>{let i=r&&r.moduleId||`custom-style-module-${e2++}`;Array.isArray(t)||(t=t?[t]:[]),t.forEach(e=>{if(!(e instanceof eX))throw Error("An item in styles is not of type CSSResult. Use `unsafeCSS` or `css`.");if(!e4[e]){let t=document.createElement("dom-module");t.innerHTML=`
        <template>
          <style>${e.toString()}</style>
        </template>
      `;let r=`custom-style-module-${e2++}`;t.register(r),e4[e]=r}});let n=document.createElement("dom-module");if(e){let t=window.customElements&&window.customElements.get(e);t&&t.hasOwnProperty("__finalized")&&console.warn(`The custom element definition for "${e}"
      was finalized before a style module was registered.
      Make sure to add component specific style modules before
      importing the corresponding custom element.`),n.setAttribute("theme-for",e)}let s=r&&r.include||[];n.innerHTML=`
    <template>
      ${s.map(e=>`<style include=${e}></style>`)}
      ${t.map(e=>`<style include=${e4[e]}></style>`)}
    </template>
  `,n.register(i)};class e3 extends HTMLElement{static get version(){return"1.6.1"}}customElements.define("vaadin-lumo-styles",e3);/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let e6=null,e7=window.HTMLImports&&window.HTMLImports.whenReady||null;function e9(e){requestAnimationFrame(function(){e7?e7(e):(e6||(e6=new Promise(e=>{r=e}),"complete"===document.readyState?r():document.addEventListener("readystatechange",()=>{"complete"===document.readyState&&r()})),e6.then(function(){e&&e()}))})}let e8="__seenByShadyCSS",te="__shadyCSSCachedStyle",tt=null,tr=null;class ti{constructor(){this.customStyles=[],this.enqueued=!1,e9(()=>{window.ShadyCSS.flushCustomStyles&&window.ShadyCSS.flushCustomStyles()})}enqueueDocumentValidation(){!this.enqueued&&tr&&(this.enqueued=!0,e9(tr))}addCustomStyle(e){e[e8]||(e[e8]=!0,this.customStyles.push(e),this.enqueueDocumentValidation())}getStyleForCustomStyle(e){return e[te]?e[te]:e.getStyle?e.getStyle():e}processStyles(){let e=this.customStyles;for(let t=0;t<e.length;t++){let r=e[t];if(r[te])continue;let i=this.getStyleForCustomStyle(r);if(i){let e=i.__appliedElement||i;tt&&tt(e),r[te]=e}}return e}}ti.prototype.addCustomStyle=ti.prototype.addCustomStyle,ti.prototype.getStyleForCustomStyle=ti.prototype.getStyleForCustomStyle,ti.prototype.processStyles=ti.prototype.processStyles,Object.defineProperties(ti.prototype,{transformCallback:{get:()=>tt,set(e){tt=e}},validateCallback:{get:()=>tr,set(e){let t=!1;tr||(t=!0),tr=e,t&&this.enqueueDocumentValidation()}}});/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let tn=/(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};{])+)|\{([^}]*)\}(?:(?=[;\s}])|$))/gi,ts=/(?:^|\W+)@apply\s*\(?([^);\n]*)\)?/gi,to=/@media\s(.*)/;/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/function ta(e,t){for(let r in t)null===r?e.style.removeProperty(r):e.style.setProperty(r,t[r])}function tl(e,t){let r=window.getComputedStyle(e).getPropertyValue(t);return r?r.trim():""}function td(e){let t=ts.test(e)||tn.test(e);return ts.lastIndex=0,tn.lastIndex=0,t}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let tc=!(window.ShadyDOM&&window.ShadyDOM.inUse);function tu(e){i=(!e||!e.shimcssproperties)&&(tc||!!(!navigator.userAgent.match(/AppleWebKit\/601|Edge\/15/)&&window.CSS&&CSS.supports&&CSS.supports("box-shadow","0 0 0 var(--foo)")))}window.ShadyCSS&&void 0!==window.ShadyCSS.cssBuild&&(n=window.ShadyCSS.cssBuild);let th=!!(window.ShadyCSS&&window.ShadyCSS.disableRuntime);window.ShadyCSS&&void 0!==window.ShadyCSS.nativeCss?i=window.ShadyCSS.nativeCss:window.ShadyCSS?(tu(window.ShadyCSS),window.ShadyCSS=void 0):tu(window.WebComponents&&window.WebComponents.flags);let tp=i,tm=new ti;window.ShadyCSS||(window.ShadyCSS={prepareTemplate(e,t,r){},prepareTemplateDom(e,t){},prepareTemplateStyles(e,t,r){},styleSubtree(e,t){tm.processStyles(),ta(e,t)},styleElement(e){tm.processStyles()},styleDocument(e){tm.processStyles(),ta(document.body,e)},getComputedStyleValue:(e,t)=>tl(e,t),flushCustomStyles(){},nativeCss:tp,nativeShadow:tc,cssBuild:n,disableRuntime:th}),window.ShadyCSS.CustomStyleInterface=tm;/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let tf="shady-unscoped";function t_(e){return J.import(e)}function ty(e){let t=e.body?e.body:e,r=C(t.textContent,e.baseURI),i=document.createElement("style");return i.textContent=r,i}function tg(e){let t=e.trim().split(/\s+/),r=[];for(let e=0;e<t.length;e++)r.push(...tv(t[e]));return r}function tv(e){let t=t_(e);if(!t)return console.warn("Could not find style data in module named",e),[];if(void 0===t._styles){let e=[];e.push(...tS(t));let r=t.querySelector("template");r&&e.push(...tb(r,t.assetpath)),t._styles=e}return t._styles}function tb(e,t){if(!e._styles){let r=[],i=e.content.querySelectorAll("style");for(let e=0;e<i.length;e++){let n=i[e],s=n.getAttribute("include");s&&r.push(...tg(s).filter(function(e,t,r){return r.indexOf(e)===t})),t&&(n.textContent=C(n.textContent,t)),r.push(n)}e._styles=r}return e._styles}function tw(e){let t=t_(e);return t?tS(t):[]}function tS(e){let t=[],r=e.querySelectorAll("link[rel=import][type~=css]");for(let e=0;e<r.length;e++){let i=r[e];if(i.import){let e=i.import,r=i.hasAttribute(tf);if(r&&!e._unscopedStyle){let t=ty(e);t.setAttribute(tf,""),e._unscopedStyle=t}else e._style||(e._style=ty(e));t.push(r?e._unscopedStyle:e._style)}}return t}function tC(e){let t=e.trim().split(/\s+/),r="";for(let e=0;e<t.length;e++)r+=tA(t[e]);return r}function tA(e){let t=t_(e);if(t&&void 0===t._cssText){let e=tx(t),r=t.querySelector("template");r&&(e+=tP(r,t.assetpath)),t._cssText=e||null}return t||console.warn("Could not find style data in module named",e),t&&t._cssText||""}function tP(e,t){let r="",i=tb(e,t);for(let e=0;e<i.length;e++){let t=i[e];t.parentNode&&t.parentNode.removeChild(t),r+=t.textContent}return r}function tx(e){let t="",r=tS(e);for(let e=0;e<r.length;e++)t+=r[e].textContent;return t}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let tE="include",tO=window.ShadyCSS.CustomStyleInterface;class tT extends HTMLElement{constructor(){super(),this._style=null,tO.addCustomStyle(this)}getStyle(){if(this._style)return this._style;let e=this.querySelector("style");if(!e)return null;this._style=e;let t=e.getAttribute(tE);return t&&(e.removeAttribute(tE),e.textContent=tC(t)+e.textContent),this.ownerDocument!==window.document&&window.document.head.appendChild(this),this._style}}window.customElements.define("custom-style",tT);let tM=document.createElement("template");tM.innerHTML=`<custom-style>
  <style>
    html {
      /* Square */
      --lumo-space-xs: 0.25rem;
      --lumo-space-s: 0.5rem;
      --lumo-space-m: 1rem;
      --lumo-space-l: 1.5rem;
      --lumo-space-xl: 2.5rem;

      /* Wide */
      --lumo-space-wide-xs: calc(var(--lumo-space-xs) / 2) var(--lumo-space-xs);
      --lumo-space-wide-s: calc(var(--lumo-space-s) / 2) var(--lumo-space-s);
      --lumo-space-wide-m: calc(var(--lumo-space-m) / 2) var(--lumo-space-m);
      --lumo-space-wide-l: calc(var(--lumo-space-l) / 2) var(--lumo-space-l);
      --lumo-space-wide-xl: calc(var(--lumo-space-xl) / 2) var(--lumo-space-xl);

      /* Tall */
      --lumo-space-tall-xs: var(--lumo-space-xs) calc(var(--lumo-space-xs) / 2);
      --lumo-space-tall-s: var(--lumo-space-s) calc(var(--lumo-space-s) / 2);
      --lumo-space-tall-m: var(--lumo-space-m) calc(var(--lumo-space-m) / 2);
      --lumo-space-tall-l: var(--lumo-space-l) calc(var(--lumo-space-l) / 2);
      --lumo-space-tall-xl: var(--lumo-space-xl) calc(var(--lumo-space-xl) / 2);
    }
  </style>
</custom-style>`,document.head.appendChild(tM.content);let tN=document.createElement("template");tN.innerHTML=`<custom-style>
  <style>
    html {
      /* Border radius */
      --lumo-border-radius-s: 0.25em; /* Checkbox, badge, date-picker year indicator, etc */
      --lumo-border-radius-m: var(--lumo-border-radius, 0.25em); /* Button, text field, menu overlay, etc */
      --lumo-border-radius-l: 0.5em; /* Dialog, notification, etc */
      --lumo-border-radius: 0.25em; /* Deprecated */

      /* Shadow */
      --lumo-box-shadow-xs: 0 1px 4px -1px var(--lumo-shade-50pct);
      --lumo-box-shadow-s: 0 2px 4px -1px var(--lumo-shade-20pct), 0 3px 12px -1px var(--lumo-shade-30pct);
      --lumo-box-shadow-m: 0 2px 6px -1px var(--lumo-shade-20pct), 0 8px 24px -4px var(--lumo-shade-40pct);
      --lumo-box-shadow-l: 0 3px 18px -2px var(--lumo-shade-20pct), 0 12px 48px -6px var(--lumo-shade-40pct);
      --lumo-box-shadow-xl: 0 4px 24px -3px var(--lumo-shade-20pct), 0 18px 64px -8px var(--lumo-shade-40pct);

      /* Clickable element cursor */
      --lumo-clickable-cursor: default;
    }
  </style>
</custom-style>`,document.head.appendChild(tN.content);let tk=document.createElement("template");tk.innerHTML=`<custom-style>
  <style>
    html {
      /* Base (background) */
      --lumo-base-color: #FFF;

      /* Tint */
      --lumo-tint-5pct: hsla(0, 0%, 100%, 0.3);
      --lumo-tint-10pct: hsla(0, 0%, 100%, 0.37);
      --lumo-tint-20pct: hsla(0, 0%, 100%, 0.44);
      --lumo-tint-30pct: hsla(0, 0%, 100%, 0.5);
      --lumo-tint-40pct: hsla(0, 0%, 100%, 0.57);
      --lumo-tint-50pct: hsla(0, 0%, 100%, 0.64);
      --lumo-tint-60pct: hsla(0, 0%, 100%, 0.7);
      --lumo-tint-70pct: hsla(0, 0%, 100%, 0.77);
      --lumo-tint-80pct: hsla(0, 0%, 100%, 0.84);
      --lumo-tint-90pct: hsla(0, 0%, 100%, 0.9);
      --lumo-tint: #FFF;

      /* Shade */
      --lumo-shade-5pct: hsla(214, 61%, 25%, 0.05);
      --lumo-shade-10pct: hsla(214, 57%, 24%, 0.1);
      --lumo-shade-20pct: hsla(214, 53%, 23%, 0.16);
      --lumo-shade-30pct: hsla(214, 50%, 22%, 0.26);
      --lumo-shade-40pct: hsla(214, 47%, 21%, 0.38);
      --lumo-shade-50pct: hsla(214, 45%, 20%, 0.5);
      --lumo-shade-60pct: hsla(214, 43%, 19%, 0.61);
      --lumo-shade-70pct: hsla(214, 42%, 18%, 0.72);
      --lumo-shade-80pct: hsla(214, 41%, 17%, 0.83);
      --lumo-shade-90pct: hsla(214, 40%, 16%, 0.94);
      --lumo-shade: hsl(214, 35%, 15%);

      /* Contrast */
      --lumo-contrast-5pct: var(--lumo-shade-5pct);
      --lumo-contrast-10pct: var(--lumo-shade-10pct);
      --lumo-contrast-20pct: var(--lumo-shade-20pct);
      --lumo-contrast-30pct: var(--lumo-shade-30pct);
      --lumo-contrast-40pct: var(--lumo-shade-40pct);
      --lumo-contrast-50pct: var(--lumo-shade-50pct);
      --lumo-contrast-60pct: var(--lumo-shade-60pct);
      --lumo-contrast-70pct: var(--lumo-shade-70pct);
      --lumo-contrast-80pct: var(--lumo-shade-80pct);
      --lumo-contrast-90pct: var(--lumo-shade-90pct);
      --lumo-contrast: var(--lumo-shade);

      /* Text */
      --lumo-header-text-color: var(--lumo-contrast);
      --lumo-body-text-color: var(--lumo-contrast-90pct);
      --lumo-secondary-text-color: var(--lumo-contrast-70pct);
      --lumo-tertiary-text-color: var(--lumo-contrast-50pct);
      --lumo-disabled-text-color: var(--lumo-contrast-30pct);

      /* Primary */
      --lumo-primary-color: hsl(214, 90%, 52%);
      --lumo-primary-color-50pct: hsla(214, 90%, 52%, 0.5);
      --lumo-primary-color-10pct: hsla(214, 90%, 52%, 0.1);
      --lumo-primary-text-color: var(--lumo-primary-color);
      --lumo-primary-contrast-color: #FFF;

      /* Error */
      --lumo-error-color: hsl(3, 100%, 61%);
      --lumo-error-color-50pct: hsla(3, 100%, 60%, 0.5);
      --lumo-error-color-10pct: hsla(3, 100%, 60%, 0.1);
      --lumo-error-text-color: hsl(3, 92%, 53%);
      --lumo-error-contrast-color: #FFF;

      /* Success */
      --lumo-success-color: hsl(145, 80%, 42%); /* hsl(144,82%,37%); */
      --lumo-success-color-50pct: hsla(145, 76%, 44%, 0.55);
      --lumo-success-color-10pct: hsla(145, 76%, 44%, 0.12);
      --lumo-success-text-color: hsl(145, 100%, 32%);
      --lumo-success-contrast-color: #FFF;
    }
  </style>
</custom-style><dom-module id="lumo-color">
  <template>
    <style>
      [theme~="dark"] {
        /* Base (background) */
        --lumo-base-color: hsl(214, 35%, 21%);

        /* Tint */
        --lumo-tint-5pct: hsla(214, 65%, 85%, 0.06);
        --lumo-tint-10pct: hsla(214, 60%, 80%, 0.14);
        --lumo-tint-20pct: hsla(214, 64%, 82%, 0.23);
        --lumo-tint-30pct: hsla(214, 69%, 84%, 0.32);
        --lumo-tint-40pct: hsla(214, 73%, 86%, 0.41);
        --lumo-tint-50pct: hsla(214, 78%, 88%, 0.5);
        --lumo-tint-60pct: hsla(214, 82%, 90%, 0.6);
        --lumo-tint-70pct: hsla(214, 87%, 92%, 0.7);
        --lumo-tint-80pct: hsla(214, 91%, 94%, 0.8);
        --lumo-tint-90pct: hsla(214, 96%, 96%, 0.9);
        --lumo-tint: hsl(214, 100%, 98%);

        /* Shade */
        --lumo-shade-5pct: hsla(214, 0%, 0%, 0.07);
        --lumo-shade-10pct: hsla(214, 4%, 2%, 0.15);
        --lumo-shade-20pct: hsla(214, 8%, 4%, 0.23);
        --lumo-shade-30pct: hsla(214, 12%, 6%, 0.32);
        --lumo-shade-40pct: hsla(214, 16%, 8%, 0.41);
        --lumo-shade-50pct: hsla(214, 20%, 10%, 0.5);
        --lumo-shade-60pct: hsla(214, 24%, 12%, 0.6);
        --lumo-shade-70pct: hsla(214, 28%, 13%, 0.7);
        --lumo-shade-80pct: hsla(214, 32%, 13%, 0.8);
        --lumo-shade-90pct: hsla(214, 33%, 13%, 0.9);
        --lumo-shade: hsl(214, 33%, 13%);

        /* Contrast */
        --lumo-contrast-5pct: var(--lumo-tint-5pct);
        --lumo-contrast-10pct: var(--lumo-tint-10pct);
        --lumo-contrast-20pct: var(--lumo-tint-20pct);
        --lumo-contrast-30pct: var(--lumo-tint-30pct);
        --lumo-contrast-40pct: var(--lumo-tint-40pct);
        --lumo-contrast-50pct: var(--lumo-tint-50pct);
        --lumo-contrast-60pct: var(--lumo-tint-60pct);
        --lumo-contrast-70pct: var(--lumo-tint-70pct);
        --lumo-contrast-80pct: var(--lumo-tint-80pct);
        --lumo-contrast-90pct: var(--lumo-tint-90pct);
        --lumo-contrast: var(--lumo-tint);

        /* Text */
        --lumo-header-text-color: var(--lumo-contrast);
        --lumo-body-text-color: var(--lumo-contrast-90pct);
        --lumo-secondary-text-color: var(--lumo-contrast-70pct);
        --lumo-tertiary-text-color: var(--lumo-contrast-50pct);
        --lumo-disabled-text-color: var(--lumo-contrast-30pct);

        /* Primary */
        --lumo-primary-color: hsl(214, 86%, 55%);
        --lumo-primary-color-50pct: hsla(214, 86%, 55%, 0.5);
        --lumo-primary-color-10pct: hsla(214, 90%, 63%, 0.1);
        --lumo-primary-text-color: hsl(214, 100%, 70%);
        --lumo-primary-contrast-color: #FFF;

        /* Error */
        --lumo-error-color: hsl(3, 90%, 63%);
        --lumo-error-color-50pct: hsla(3, 90%, 63%, 0.5);
        --lumo-error-color-10pct: hsla(3, 90%, 63%, 0.1);
        --lumo-error-text-color: hsl(3, 100%, 67%);

        /* Success */
        --lumo-success-color: hsl(145, 65%, 42%);
        --lumo-success-color-50pct: hsla(145, 65%, 42%, 0.5);
        --lumo-success-color-10pct: hsla(145, 65%, 42%, 0.1);
        --lumo-success-text-color: hsl(145, 85%, 47%);
      }

      html {
        color: var(--lumo-body-text-color);
        background-color: var(--lumo-base-color);
      }

      [theme~="dark"] {
        color: var(--lumo-body-text-color);
        background-color: var(--lumo-base-color);
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        color: var(--lumo-header-text-color);
      }

      a {
        color: var(--lumo-primary-text-color);
      }

      blockquote {
        color: var(--lumo-secondary-text-color);
      }

      code,
      pre {
        background-color: var(--lumo-contrast-10pct);
        border-radius: var(--lumo-border-radius-m);
      }
    </style>
  </template>
</dom-module><dom-module id="lumo-color-legacy">
  <template>
    <style include="lumo-color">
      :host {
        color: var(--lumo-body-text-color) !important;
        background-color: var(--lumo-base-color) !important;
      }
    </style>
  </template>
</dom-module>`,document.head.appendChild(tk.content);let tI=document.createElement("template");tI.innerHTML=`<custom-style>
  <style>
    html {
      /* Font families */
      --lumo-font-family: -apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";

      /* Font sizes */
      --lumo-font-size-xxs: .75rem;
      --lumo-font-size-xs: .8125rem;
      --lumo-font-size-s: .875rem;
      --lumo-font-size-m: 1rem;
      --lumo-font-size-l: 1.125rem;
      --lumo-font-size-xl: 1.375rem;
      --lumo-font-size-xxl: 1.75rem;
      --lumo-font-size-xxxl: 2.5rem;

      /* Line heights */
      --lumo-line-height-xs: 1.25;
      --lumo-line-height-s: 1.375;
      --lumo-line-height-m: 1.625;
    }

  </style>
</custom-style><dom-module id="lumo-typography">
  <template>
    <style>
      html {
        font-family: var(--lumo-font-family);
        font-size: var(--lumo-font-size, var(--lumo-font-size-m));
        line-height: var(--lumo-line-height-m);
        -webkit-text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      /* Can’t combine with the above selector because that doesn’t work in browsers without native shadow dom */
      :host {
        font-family: var(--lumo-font-family);
        font-size: var(--lumo-font-size, var(--lumo-font-size-m));
        line-height: var(--lumo-line-height-m);
        -webkit-text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      small,
      [theme~="font-size-s"] {
        font-size: var(--lumo-font-size-s);
        line-height: var(--lumo-line-height-s);
      }

      [theme~="font-size-xs"] {
        font-size: var(--lumo-font-size-xs);
        line-height: var(--lumo-line-height-xs);
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        font-weight: 600;
        line-height: var(--lumo-line-height-xs);
        margin-top: 1.25em;
      }

      h1 {
        font-size: var(--lumo-font-size-xxxl);
        margin-bottom: 0.75em;
      }

      h2 {
        font-size: var(--lumo-font-size-xxl);
        margin-bottom: 0.5em;
      }

      h3 {
        font-size: var(--lumo-font-size-xl);
        margin-bottom: 0.5em;
      }

      h4 {
        font-size: var(--lumo-font-size-l);
        margin-bottom: 0.5em;
      }

      h5 {
        font-size: var(--lumo-font-size-m);
        margin-bottom: 0.25em;
      }

      h6 {
        font-size: var(--lumo-font-size-xs);
        margin-bottom: 0;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      p,
      blockquote {
        margin-top: 0.5em;
        margin-bottom: 0.75em;
      }

      a {
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      hr {
        display: block;
        align-self: stretch;
        height: 1px;
        border: 0;
        padding: 0;
        margin: var(--lumo-space-s) calc(var(--lumo-border-radius-m) / 2);
        background-color: var(--lumo-contrast-10pct);
      }

      blockquote {
        border-left: 2px solid var(--lumo-contrast-30pct);
      }

      b,
      strong {
        font-weight: 600;
      }

      /* RTL specific styles */

      blockquote[dir="rtl"] {
        border-left: none;
        border-right: 2px solid var(--lumo-contrast-30pct);
      }

    </style>
  </template>
</dom-module>`,document.head.appendChild(tI.content);let tL=document.createElement("template");tL.innerHTML=`<dom-module id="lumo-overlay">
  <template>
    <style>
      :host {
        top: var(--lumo-space-m);
        right: var(--lumo-space-m);
        bottom: var(--lumo-space-m);
        left: var(--lumo-space-m);
        /* Workaround for Edge issue (only on Surface), where an overflowing vaadin-list-box inside vaadin-select-overlay makes the overlay transparent */
        /* stylelint-disable-next-line */
        outline: 0px solid transparent;
      }

      [part="overlay"] {
        background-color: var(--lumo-base-color);
        background-image: linear-gradient(var(--lumo-tint-5pct), var(--lumo-tint-5pct));
        border-radius: var(--lumo-border-radius-m);
        box-shadow: 0 0 0 1px var(--lumo-shade-5pct), var(--lumo-box-shadow-m);
        color: var(--lumo-body-text-color);
        font-family: var(--lumo-font-family);
        font-size: var(--lumo-font-size-m);
        font-weight: 400;
        line-height: var(--lumo-line-height-m);
        letter-spacing: 0;
        text-transform: none;
        -webkit-text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      [part="content"] {
        padding: var(--lumo-space-xs);
      }

      [part="backdrop"] {
        background-color: var(--lumo-shade-20pct);
        animation: 0.2s lumo-overlay-backdrop-enter both;
        will-change: opacity;
      }

      @keyframes lumo-overlay-backdrop-enter {
        0% {
          opacity: 0;
        }
      }

      :host([closing]) [part="backdrop"] {
        animation: 0.2s lumo-overlay-backdrop-exit both;
      }

      @keyframes lumo-overlay-backdrop-exit {
        100% {
          opacity: 0;
        }
      }

      @keyframes lumo-overlay-dummy-animation {
        0% { opacity: 1; }
        100% { opacity: 1; }
      }
    </style>
  </template>
</dom-module>`,document.head.appendChild(tL.content);let tR=document.createElement("template");tR.innerHTML=`<dom-module id="lumo-menu-overlay-core">
  <template>
    <style>
      :host([opening]),
      :host([closing]) {
        animation: 0.14s lumo-overlay-dummy-animation;
      }

      [part="overlay"] {
        will-change: opacity, transform;
      }

      :host([opening]) [part="overlay"] {
        animation: 0.1s lumo-menu-overlay-enter ease-out both;
      }

      @keyframes lumo-menu-overlay-enter {
        0% {
          opacity: 0;
          transform: translateY(-4px);
        }
      }

      :host([closing]) [part="overlay"] {
        animation: 0.1s lumo-menu-overlay-exit both;
      }

      @keyframes lumo-menu-overlay-exit {
        100% {
          opacity: 0;
        }
      }
    </style>
  </template>
</dom-module><dom-module id="lumo-menu-overlay">
  <template>
    <style include="lumo-overlay lumo-menu-overlay-core">
      /* Small viewport (bottom sheet) styles */
      /* Use direct media queries instead of the state attributes (\`[phone]\` and \`[fullscreen]\`) provided by the elements */
      @media (max-width: 420px), (max-height: 420px) {
        :host {
          top: 0 !important;
          right: 0 !important;
          bottom: var(--vaadin-overlay-viewport-bottom, 0) !important;
          left: 0 !important;
          align-items: stretch !important;
          justify-content: flex-end !important;
        }

        [part="overlay"] {
          max-height: 50vh;
          width: 100vw;
          border-radius: 0;
          box-shadow: var(--lumo-box-shadow-xl);
        }

        /* The content part scrolls instead of the overlay part, because of the gradient fade-out */
        [part="content"] {
          padding: 30px var(--lumo-space-m);
          max-height: inherit;
          box-sizing: border-box;
          -webkit-overflow-scrolling: touch;
          overflow: auto;
          -webkit-mask-image: linear-gradient(transparent, #000 40px, #000 calc(100% - 40px), transparent);
          mask-image: linear-gradient(transparent, #000 40px, #000 calc(100% - 40px), transparent);
        }

        [part="backdrop"] {
          display: block;
        }

        /* Animations */

        :host([opening]) [part="overlay"] {
          animation: 0.2s lumo-mobile-menu-overlay-enter cubic-bezier(.215, .61, .355, 1) both;
        }

        :host([closing]),
        :host([closing]) [part="backdrop"] {
          animation-delay: 0.14s;
        }

        :host([closing]) [part="overlay"] {
          animation: 0.14s 0.14s lumo-mobile-menu-overlay-exit cubic-bezier(.55, .055, .675, .19) both;
        }
      }

      @keyframes lumo-mobile-menu-overlay-enter {
        0% {
          transform: translateY(150%);
        }
      }

      @keyframes lumo-mobile-menu-overlay-exit {
        100% {
          transform: translateY(150%);
        }
      }
    </style>
  </template>
</dom-module>`,document.head.appendChild(tR.content);let tF=document.createElement("template");tF.innerHTML=`<custom-style>
  <style>
    @font-face {
      font-family: 'lumo-icons';
      src: url(data:application/font-woff;charset=utf-8;base64,d09GRgABAAAAABEcAAsAAAAAIiwAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAABHU1VCAAABCAAAADsAAABUIIslek9TLzIAAAFEAAAAQwAAAFZAIUuKY21hcAAAAYgAAAD4AAADrsCU8d5nbHlmAAACgAAAC2MAABd4h9To2WhlYWQAAA3kAAAAMAAAADZa/6SsaGhlYQAADhQAAAAdAAAAJAbpA35obXR4AAAONAAAABAAAACspBAAAGxvY2EAAA5EAAAAWAAAAFh55IAsbWF4cAAADpwAAAAfAAAAIAFKAXBuYW1lAAAOvAAAATEAAAIuUUJZCHBvc3QAAA/wAAABKwAAAelm8SzVeJxjYGRgYOBiMGCwY2BycfMJYeDLSSzJY5BiYGGAAJA8MpsxJzM9kYEDxgPKsYBpDiBmg4gCACY7BUgAeJxjYGS+yDiBgZWBgamKaQ8DA0MPhGZ8wGDIyAQUZWBlZsAKAtJcUxgcXjG+0mIO+p/FEMUcxDANKMwIkgMABn8MLQB4nO3SWW6DMABF0UtwCEnIPM/zhLK8LqhfXRybSP14XUYtHV9hGYQwQBNIo3cUIPkhQeM7rib1ekqnXg981XuC1qvy84lzojleh3puxL0hPjGjRU473teloEefAUNGjJkwZcacBUtWrNmwZceeA0dOnLlw5cadB09elPGhGf+j0NTI/65KfXerT6JhqKnpRKtgOpuqaTrtKjPUlqHmhto21I7pL6i6hlqY3q7qGWrfUAeGOjTUkaGODXViqFNDnRnq3FAXhro01JWhrg11Y6hbQ90Z6t5QD4Z6NNSToZ4N9WKoV0O9GerdUB+G+jTUl6GWRvkL24BkEXictVh9bFvVFb/nxvbz+7Rf/N6zHcd2bCfP+Wgc1Z9N0jpNnEL6kbRVS6HA2hQYGh9TGR1CbCqa2rXrWOkQE/sHNJgmtZvoVNZqE1B1DNHxzTQxCehUTYiJTQyENui0qSLezr3PduyQfgmRWOfde8+9551z7rnn/O4jLoJ/bRP0UaKQMLFJjpBAvphLZC3Dk0ok7WBzR2/upJs7Ryw/nfFbln/uuN/apCvwrKLrSvUqRufbm5pn0fs0w4gYxnGVP6qHnO4bWiDQGQgwtS6lm3lB3QoX1M2vwEmuzirF39y+Es2+DJ8d1pkyqBIqoze3D1+Zz4DrFoazxI8dWwMrDlZ2DMqQAR9AROsJU+2cmlTPazTco52F1xTa2a2+K8vvq92dVHmtLoPeQX/AZPRYGthDYOeZjBjKoFsVGulR3lWU95WeCK44qHU7MhWUGUKZDT3oKUcG2GWuh+EDDfUYA/jhAhl0TOsJNYSEu7mQmi3UzfXwZKA4BsVsHLXQYGgRW95uEtpJ1Vfn9XiLriRBlFEqxsDjA09yCNUoQxxwd7KWSTt2y3GTKiflqHRSoWZc3m11Wa/fJdFgXD4sSYfleJBKd8GMz7J8dZn/cGRCcKGDnA2Ge3fKzcvlnTDNthGWLXzX/WaXtUAmRgeLlHSr30r0G9UTXMb0AtmwzOoy73fkSlHZkduw/TYuU9cAD4YutPoxTTsA3797wVr4Z/1NC5zARHr4vtxJjxIfiZMhMkbWk+14BnJZKwqGZwDfswLyxWDSg11rFLJF7Nopxjd1h1/QOT+oezgfu3Yq+Hk+duf5x+40o1GTkaIgikK/IEnC6aYxCUBaZJSN4XTYFjU/YMNIKqJwhDGOCCI8FDXnXmXjtGhGJyShqjAOnBOkW2JG9S7GgYeMWAU5JzhnWmBOaOM+CKEPoqSfFDC2Unq+DLlUgUVUFFLZGJg6jtlojsdsa8kPObPuJdi5dnBdBsLJMGTWDa4t2JvtwuPo9s+Y86suv/W33QG1rAaOAUV+vx4K6f2D04PVKlC7WLSrZzAi45ZV6lIC7WoXqmRyvUqoVwrzUoVsIjeTXWQv+RH5GTlBXiB/In8ln0IbBCAFOajAJrgZYyOHWqOfUe/aHjI12R6OQo1jCgt215l+4f6XPb+0MNou0V+43n2F77tSfRb24d7zitgnKmvYHs69zugaPvBwv6ioXkb2LdL65Atw51uLkXlu1bhMMRcXSPcYoqKIRlh34lQP8/5JbuUFye4vxD6/6MxFF11C0uVLr9Ulgw44tS3pMViNLUExbycFgLIct+QDMibRimx1ydUz8FXZiuOIDBOMVX2nUZc+huNE5XUJ81uiJoiabwqaVF0uacKbau/pl4R2VW0XXlJra6boVrYG646TF5NYzwy4vjENVrDlcNpZPl8DH6XX8XWCx0mvWVZY6KFLrvsY66/zPict5FnxaNUR/juvZCM3TvD60E2W1tZizbXTPDuabcm0nbbzpWKpmA1ayBQ8giedLUM+A0kNjBjQjmuYz7YrgIXYvmF63ZLBwSXrpn9Tb9wwdd/U1H0PMQK3XcO8ul3WT7PyPPdpy0TemKxNRcJNauiXJnnUDpUppQWs4SnUIy0EESGYqJYQLGHxzaGWwVIaS6Y7mQFM8ZjYDQ3axjf61SWjU33JwOZA1pwaG1L9mzf71aHRdX1JHw6Fp0aXhNwbqyeGNg4NbdzGCBxoz4ZXjy4Nu69Zr6sDY6vMrLU5nA1P8JkbdWXJ6ERfMryvNh1JfQ9+T4dIhGvK9w3dxjBBzatsQ/MlOHVIDnYpDz6odAXlQ01t2Pa5Iafd8MMpxAeDKP0C6CjgVLT5osB6icUx01lWjXxzT/GyRF2welEM5Z/7jG3VjQ1SrNn5IbyzOG5dobB3/QHxyZvsXcoz8IoEwS7plCg+zxHQk424q9BfEpkESJbFHQusDBSWFkuBkoPO0kLKwRVYjxGXlHTcTDQMJ/H6TX9afkO7mnraTO1feTnZAXLu4cp7HAXMmNG1yeFk9TgS/NHhZR/4QoBTr/ZB+6hCgyl15Nq1UbN6nE1/ZnP1U2cizCBpvs8cJQZJ4LkYx5N/yZPAUZNQQ0V4f3BQllWrK3YRzl30dOT6RVn2upNur6woSa8CqpdT/aKnBM4o3jNur9d9xqtUT6veBEt9Ca9at+ERzEEhUkR8sa5mQ4aVvJoVeEA8zI4ei5mULXFGyU7z/6TAeYLVcpzSWZY8PYYF5yrTV60sT0+XV141vX++Wf16V2bFeGVPZXxFpkvyeKTWLlzfW0mnKxsY6Y3294/0998SCfX1blm5pbcvFGlq/r07MRAMhYIDiW5JFKWW3vdrEpCsZSJG+om7Zu/PSScZJhNkLbmW5Wsr12pWqW5zKtlwRS4bFOxUw17mCzy6lskCDl1WYOGWDYrADrMA7BDDweWWNd5koiJnR1dz+ytLP2q0SqPB1lnK2ccB7RYe4FSoPks3iB3t4txTSHctb2sy1ivk0pvHuCNm6w1f6wxv3+OCgN78LqdQnUVh7R0oTAp0zOf2rbW770Vu5C2dIyGdTnHo8zSji7dppj0USoVCz+lhRMTh53Teq9VbGfbjuSbAooSdXayY4PYHg374C6f7gl1B/DXuJ4/QXxOBdJFJspFsI3egpoWUUCjlTIFnNYNl+ZyZKmBeYKGHkD1QyDlhaKbKwKcIJqJ4TLJ2OmdY/JWXae4DdGBw8HZ7eXcgFF2zr2SoalDry5iKqoa0Puhe3hPQ2s3elTYM+MI+n3rK0KgL7/La3GeMLt6m7u912vGnvtORiIa0qBmhqVi+XW9XNBmqb8eVgKzIHfGI5bNoG7X0UCzeISmqIcO/nY8FH7U8avX9fx/ST+hx0sezPw9Qy8Mum3GWf2N4Uy/yIYGVBXbJHWIZp7dfTcptdMTr9Qmq7DaiK/ukqCL4kt4RUfS5XPnMtmT22/mQFqF7emSqtrlu8SVElxDRJrZODkpuwe0VfTfjdEp1f7A7v+fozNBXUJ/6WTuK2TtFlpFVZAZ3LcFvUi1Z2p2YT+EMAkGJVStOzLTAPg4IqWIAlzRSjOBkl2zxj3TKycpzT/MnvX3uaSMWM+gU0rkXjohhefVRMaps3/kLMSKv23lT23uxQrkQjyOJleMDsdhAnD6ZGElWZ5MjCXzCE/hkWX+WF4knzGhVOyK2eQZekV3eyo0zL8kuYWCnDCvjjhAkcTPOBDXVdoav3HVcFnQjLvtV9S2p0zA6JegPwMQxt+yFb3ll9zGlq/5dRKb3cEyQYoaNYpharJ7xCB7AWxsLY3jjZXY0XsZj0Wjwc9I6PP/dKABnCZaqHpaZEACxk4ZeLZSKNgZABl+lYQX1sJQOSX3n6r410evcoud5JeAGUXVP9H1tZOKejTq4Ono0z0erro1FrnOpohva1d/hTdtVsQdKN5W9RlT3NjD0nznyKNTgKAMfWNWcyodV0IGLPIHOF0o4JyqufaK4z6WIIzuGh3d8c8cwQg8ER+OVxyrjdm8vNuhts4LoOihGxIMuUdgzwiYN7xhh1+oZnJNuTG7gQZvu4XWZ9GAZZjGEubwePqYhtKDTH+9VQkl17/iGybsnJ+8+sKtyPrcll9ty65Zsdst/9iqpEKh7M5VdBxh3csOdNc6tW3I1uyM1PzOXegSOrLFsFNI2O27M+TF2ApnN9MUv5ud6LjxIvEQnHRzxIu4IsA9MLFkJn2tcZoZ7ON7dXe7ujrc8HrusPKamlqXwd77lQUuLpilau4PUMapueBb7irU4RoUXEYXuVuIGlRGmOp+2lNkaRPVziOqmlaZvaqG4dFgSj0jxEJWrv12IUWntmw+rfQarRE0Aph4ocI6nlUlGqs+u3/+T/ethW62PpHp2eHbZstnh/wOO95yDAHicY2BkYGAA4pmJ6QHx/DZfGbiZXwBFGGpUNzQi6P+vmacy3QJyORiYQKIANoULVXicY2BkYGAO+p8FJF8wAAHzVAZGBlSgDQBW9gNvAAAAeJxjYGBgYH4xNDAAzwQmjwAAAAAATgCaAOgBCgEsAU4BcAGaAcQB7gIaApwC6ASaBLwE1gTyBQ4FKgV6BdAF/gZEBmYGtgcYB5AIGAhSCGoI/glGCb4J2goECjwKggq4CvALUAuWC7x4nGNgZGBg0GZMYRBlAAEmIOYCQgaG/2A+AwAYlAG8AHicbZE9TsMwGIbf9A/RSggEYmHxAgtq+jN2ZGj3Dt3T1GlTOXHkuBW9AyfgEByCgTNwCA7BW/NJlVBtyd/jx+8XKwmAa3whwnFE6Ib1OBq44O6Pm6Qb4Rb5QbiNHh6FO/RD4S6eMRHu4RaaT4halzR3eBVu4Apvwk36d+EW+UO4jXt8Cnfov4W7WOBHuIen6MXsCtvPU1vWc73emcSdxIkW2tW5LdUoHp7kTJfaJV6v1PKg6v167H2mMmcLNbWl18ZYVTm71amPN95Xk8EgEx+ntoDBDgUs+siRspaoMef7rukNEriziXNuwS7Hmoe9wggxv+e55IzJMqQTeNYV00scuNbY8+YxrUfGfcaMZb/CNPQe04bT0lThbEuT0sfYhK6K/23Amf3Lx+H24hcj4GScAAAAeJxtjtlugzAQRbkJUEJIuu/7vqR8lGNPAcWx0YAb5e/LklR96EgenSufGY038PqKvf9rhgGG8BEgxA4ijBBjjAQTTLGLPezjAIc4wjFOcIoznOMCl7jCNW5wizvc4wGPeMIzXvCKN7zjAzN8eonQRWZSSaYmjvug6ase98hFltexMJmmVNmV2WBvdNgZUc+ujAWzXW3UDnu1w43asStHc8GpzAXX/py0jqTQZJTgkcxJLpaCF0lD32xNt+43tAsn29Dft02uDKS2cjGUNgsk26qK2lFthYoU27INPqmiDqg5goe0pqR5qSoqMdek/CUZFywL46rEsiImleqiqoMyt4baXlu/1GLdNFf5zbcNmdr1YUWCZe47o+zUmb/DoStbw3cVsef9ALjjiPQA) format('woff');
      font-weight: normal;
      font-style: normal;
    }

    html {
      --lumo-icons-align-center: "\\ea01";
      --lumo-icons-align-left: "\\ea02";
      --lumo-icons-align-right: "\\ea03";
      --lumo-icons-angle-down: "\\ea04";
      --lumo-icons-angle-left: "\\ea05";
      --lumo-icons-angle-right: "\\ea06";
      --lumo-icons-angle-up: "\\ea07";
      --lumo-icons-arrow-down: "\\ea08";
      --lumo-icons-arrow-left: "\\ea09";
      --lumo-icons-arrow-right: "\\ea0a";
      --lumo-icons-arrow-up: "\\ea0b";
      --lumo-icons-bar-chart: "\\ea0c";
      --lumo-icons-bell: "\\ea0d";
      --lumo-icons-calendar: "\\ea0e";
      --lumo-icons-checkmark: "\\ea0f";
      --lumo-icons-chevron-down: "\\ea10";
      --lumo-icons-chevron-left: "\\ea11";
      --lumo-icons-chevron-right: "\\ea12";
      --lumo-icons-chevron-up: "\\ea13";
      --lumo-icons-clock: "\\ea14";
      --lumo-icons-cog: "\\ea15";
      --lumo-icons-cross: "\\ea16";
      --lumo-icons-download: "\\ea17";
      --lumo-icons-dropdown: "\\ea18";
      --lumo-icons-edit: "\\ea19";
      --lumo-icons-error: "\\ea1a";
      --lumo-icons-eye: "\\ea1b";
      --lumo-icons-eye-disabled: "\\ea1c";
      --lumo-icons-menu: "\\ea1d";
      --lumo-icons-minus: "\\ea1e";
      --lumo-icons-ordered-list: "\\ea1f";
      --lumo-icons-phone: "\\ea20";
      --lumo-icons-photo: "\\ea21";
      --lumo-icons-play: "\\ea22";
      --lumo-icons-plus: "\\ea23";
      --lumo-icons-redo: "\\ea24";
      --lumo-icons-reload: "\\ea25";
      --lumo-icons-search: "\\ea26";
      --lumo-icons-undo: "\\ea27";
      --lumo-icons-unordered-list: "\\ea28";
      --lumo-icons-upload: "\\ea29";
      --lumo-icons-user: "\\ea2a";
    }
  </style>
</custom-style>`,document.head.appendChild(tF.content);let tD=document.createElement("template");tD.innerHTML=`<custom-style>
  <style>
    html {
      --lumo-size-xs: 1.625rem;
      --lumo-size-s: 1.875rem;
      --lumo-size-m: 2.25rem;
      --lumo-size-l: 2.75rem;
      --lumo-size-xl: 3.5rem;

      /* Icons */
      --lumo-icon-size-s: 1.25em;
      --lumo-icon-size-m: 1.5em;
      --lumo-icon-size-l: 2.25em;
      /* For backwards compatibility */
      --lumo-icon-size: var(--lumo-icon-size-m);
    }
  </style>
</custom-style>`,document.head.appendChild(tD.content),e5("vaadin-context-menu-overlay",eQ`
    :host([phone]) {
      top: 0 !important;
      right: 0 !important;
      bottom: var(--vaadin-overlay-viewport-bottom) !important;
      left: 0 !important;
      align-items: stretch;
      justify-content: flex-end;
    }

    /* TODO These style overrides should not be needed.
       We should instead offer a way to have non-selectable items inside the context menu. */

    :host {
      --_lumo-list-box-item-selected-icon-display: none;
      --_lumo-list-box-item-padding-left: calc(var(--lumo-space-m) + var(--lumo-border-radius) / 4);
    }

    [part='overlay'] {
      outline: none;
    }
  `,{include:["lumo-menu-overlay"],moduleId:"lumo-context-menu-overlay"}),e5("vaadin-context-menu-list-box",eQ`
    :host(.vaadin-menu-list-box) {
      --_lumo-list-box-item-selected-icon-display: block;
    }

    /* Normal item */
    [part='items'] ::slotted(.vaadin-menu-item) {
      -webkit-tap-highlight-color: var(--lumo-primary-color-10pct);
      cursor: default;
    }

    [part='items'] ::slotted(.vaadin-menu-item) {
      outline: none;
      border-radius: var(--lumo-border-radius);
      padding-left: var(--_lumo-list-box-item-padding-left, calc(var(--lumo-border-radius) / 4));
      padding-right: calc(var(--lumo-space-l) + var(--lumo-border-radius) / 4);
    }

    :host(.vaadin-menu-list-box) [part='items'] ::slotted(.vaadin-menu-item) {
      padding-left: calc(var(--lumo-border-radius) / 4);
      padding-right: calc(var(--lumo-space-l) + var(--lumo-border-radius) / 4);
    }

    /* Hovered item */
    /* TODO a workaround until we have "focus-follows-mouse". After that, use the hover style for focus-ring as well */
    [part='items'] ::slotted(.vaadin-menu-item:hover:not([disabled])),
    [part='items'] ::slotted(.vaadin-menu-item[expanded]:not([disabled])) {
      background-color: var(--lumo-primary-color-10pct);
    }

    /* RTL styles */
    :host([dir='rtl'])[part='items'] ::slotted(.vaadin-menu-item) {
      padding-left: calc(var(--lumo-space-l) + var(--lumo-border-radius) / 4);
      padding-right: var(--_lumo-list-box-item-padding-left, calc(var(--lumo-border-radius) / 4));
    }

    :host([dir='rtl'].vaadin-menu-list-box) [part='items'] ::slotted(.vaadin-menu-item) {
      padding-left: calc(var(--lumo-space-l) + var(--lumo-border-radius) / 4);
      padding-right: calc(var(--lumo-border-radius) / 4);
    }

    /* Focused item */
    @media (pointer: coarse) {
      [part='items'] ::slotted(.vaadin-menu-item:hover:not([expanded]):not([disabled])) {
        background-color: transparent;
      }
    }
  `,{moduleId:"lumo-context-menu-list-box"}),e5("vaadin-context-menu-item",eQ`
    :host {
      user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
    }

    :host(.vaadin-menu-item[menu-item-checked])::before {
      opacity: 1;
    }

    :host(.vaadin-menu-item.vaadin-context-menu-parent-item)::after {
      font-family: lumo-icons;
      font-size: var(--lumo-icon-size-xs);
      content: var(--lumo-icons-angle-right);
      color: var(--lumo-tertiary-text-color);
    }

    :host(:not([dir='rtl']).vaadin-menu-item.vaadin-context-menu-parent-item)::after {
      margin-right: calc(var(--lumo-space-m) * -1);
      padding-left: var(--lumo-space-m);
    }

    :host([expanded]) {
      background-color: var(--lumo-primary-color-10pct);
    }

    /* RTL styles */
    :host([dir='rtl'].vaadin-menu-item.vaadin-context-menu-parent-item)::after {
      content: var(--lumo-icons-angle-left);
      margin-left: calc(var(--lumo-space-m) * -1);
      padding-right: var(--lumo-space-m);
    }
  `,{moduleId:"lumo-context-menu-item"}),e5("vaadin-item",eQ`
    :host {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      font-family: var(--lumo-font-family);
      font-size: var(--lumo-font-size-m);
      line-height: var(--lumo-line-height-xs);
      padding: 0.5em 1em;
      min-height: var(--lumo-size-m);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-tap-highlight-color: transparent;
    }

    /* Checkmark */
    :host([tabindex])::before {
      display: var(--_lumo-item-selected-icon-display, none);
      content: var(--lumo-icons-checkmark);
      font-family: lumo-icons;
      font-size: var(--lumo-icon-size-m);
      line-height: 1;
      font-weight: normal;
      width: 1em;
      height: 1em;
      margin: calc((1 - var(--lumo-line-height-xs)) * var(--lumo-font-size-m) / 2) 0;
      color: var(--lumo-primary-text-color);
      flex: none;
      opacity: 0;
      transition: transform 0.2s cubic-bezier(0.12, 0.32, 0.54, 2), opacity 0.1s;
    }

    :host([selected])::before {
      opacity: 1;
    }

    :host([active]:not([selected]))::before {
      transform: scale(0.8);
      opacity: 0;
      transition-duration: 0s;
    }

    [part='content'] {
      flex: auto;
    }

    /* Disabled */
    :host([disabled]) {
      color: var(--lumo-disabled-text-color);
      cursor: default;
      pointer-events: none;
    }

    /* Slotted icons */
    :host ::slotted(iron-icon) {
      width: var(--lumo-icon-size-m);
      height: var(--lumo-icon-size-m);
    }
  `,{moduleId:"lumo-item"});/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let tz=0;function tB(){}tB.prototype.__mixinApplications,tB.prototype.__mixinSet;let tj=function(e){let t=e.__mixinApplications;t||(t=new WeakMap,e.__mixinApplications=t);let r=tz++;return function(i){let n=i.__mixinSet;if(n&&n[r])return i;let s=t,o=s.get(i);if(!o){o=e(i),s.set(i,o);let t=Object.create(o.__mixinSet||n||null);t[r]=!0,o.__mixinSet=t}return o}},tH=window.ShadyDOM&&window.ShadyDOM.noPatch&&window.ShadyDOM.wrap?window.ShadyDOM.wrap:window.ShadyDOM?e=>ShadyDOM.patch(e):e=>e;/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/function tU(e){return e.indexOf(".")>=0}function tq(e){let t=e.indexOf(".");return -1===t?e:e.slice(0,t)}function tV(e,t){return 0===e.indexOf(t+".")}function tW(e,t){return 0===t.indexOf(e+".")}function tY(e,t,r){return t+r.slice(e.length)}function tG(e,t){return e===t||tV(e,t)||tW(e,t)}function tJ(e){if(!Array.isArray(e))return e;{let t=[];for(let r=0;r<e.length;r++){let i=e[r].toString().split(".");for(let e=0;e<i.length;e++)t.push(i[e])}return t.join(".")}}function t$(e){return Array.isArray(e)?tJ(e).split("."):e.toString().split(".")}function tX(e,t,r){let i=e,n=t$(t);for(let e=0;e<n.length;e++){if(!i)return;i=i[n[e]]}return r&&(r.path=n.join(".")),i}function tZ(e,t,r){let i=e,n=t$(t),s=n[n.length-1];if(n.length>1){for(let e=0;e<n.length-1;e++)if(!(i=i[n[e]]))return;i[s]=r}else i[t]=r;return n.join(".")}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let tK={},tQ=/-[a-z]/g,t0=/([A-Z])/g;function t1(e){return tK[e]||(tK[e]=0>e.indexOf("-")?e:e.replace(tQ,e=>e[1].toUpperCase()))}function t2(e){return tK[e]||(tK[e]=e.replace(t0,"-$1").toLowerCase())}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let t4=0,t5=0,t3=[],t6=0,t7=!1,t9=document.createTextNode("");function t8(){t7=!1;let e=t3.length;for(let t=0;t<e;t++){let e=t3[t];if(e)try{e()}catch(e){setTimeout(()=>{throw e})}}t3.splice(0,e),t5+=e}new window.MutationObserver(t8).observe(t9,{characterData:!0});let re={after:e=>({run:t=>window.setTimeout(t,e),cancel(e){window.clearTimeout(e)}}),run:(e,t)=>window.setTimeout(e,t),cancel(e){window.clearTimeout(e)}},rt={run:e=>window.requestIdleCallback?window.requestIdleCallback(e):window.setTimeout(e,16),cancel(e){window.cancelIdleCallback?window.cancelIdleCallback(e):window.clearTimeout(e)}},rr={run:e=>(t7||(t7=!0,t9.textContent=t6++),t3.push(e),t4++),cancel(e){let t=e-t5;if(t>=0){if(!t3[t])throw Error("invalid async handle: "+e);t3[t]=null}}},ri=tj(e=>{class t extends e{static createProperties(e){let t=this.prototype;for(let r in e)r in t||t._createPropertyAccessor(r)}static attributeNameForProperty(e){return e.toLowerCase()}static typeForProperty(e){}_createPropertyAccessor(e,t){this._addPropertyToAttributeMap(e),this.hasOwnProperty(JSCompiler_renameProperty("__dataHasAccessor",this))||(this.__dataHasAccessor=Object.assign({},this.__dataHasAccessor)),this.__dataHasAccessor[e]||(this.__dataHasAccessor[e]=!0,this._definePropertyAccessor(e,t))}_addPropertyToAttributeMap(e){this.hasOwnProperty(JSCompiler_renameProperty("__dataAttributes",this))||(this.__dataAttributes=Object.assign({},this.__dataAttributes));let t=this.__dataAttributes[e];return t||(t=this.constructor.attributeNameForProperty(e),this.__dataAttributes[t]=e),t}_definePropertyAccessor(e,t){Object.defineProperty(this,e,{get(){return this.__data[e]},set:t?function(){}:function(t){this._setPendingProperty(e,t,!0)&&this._invalidateProperties()}})}constructor(){super(),this.__dataEnabled=!1,this.__dataReady=!1,this.__dataInvalid=!1,this.__data={},this.__dataPending=null,this.__dataOld=null,this.__dataInstanceProps=null,this.__dataCounter=0,this.__serializing=!1,this._initializeProperties()}ready(){this.__dataReady=!0,this._flushProperties()}_initializeProperties(){for(let e in this.__dataHasAccessor)this.hasOwnProperty(e)&&(this.__dataInstanceProps=this.__dataInstanceProps||{},this.__dataInstanceProps[e]=this[e],delete this[e])}_initializeInstanceProperties(e){Object.assign(this,e)}_setProperty(e,t){this._setPendingProperty(e,t)&&this._invalidateProperties()}_getProperty(e){return this.__data[e]}_setPendingProperty(e,t,r){let i=this.__data[e],n=this._shouldPropertyChange(e,t,i);return n&&(this.__dataPending||(this.__dataPending={},this.__dataOld={}),!this.__dataOld||e in this.__dataOld||(this.__dataOld[e]=i),this.__data[e]=t,this.__dataPending[e]=t),n}_isPropertyPending(e){return!!(this.__dataPending&&this.__dataPending.hasOwnProperty(e))}_invalidateProperties(){!this.__dataInvalid&&this.__dataReady&&(this.__dataInvalid=!0,rr.run(()=>{this.__dataInvalid&&(this.__dataInvalid=!1,this._flushProperties())}))}_enableProperties(){this.__dataEnabled||(this.__dataEnabled=!0,this.__dataInstanceProps&&(this._initializeInstanceProperties(this.__dataInstanceProps),this.__dataInstanceProps=null),this.ready())}_flushProperties(){this.__dataCounter++;let e=this.__data,t=this.__dataPending,r=this.__dataOld;this._shouldPropertiesChange(e,t,r)&&(this.__dataPending=null,this.__dataOld=null,this._propertiesChanged(e,t,r)),this.__dataCounter--}_shouldPropertiesChange(e,t,r){return!!t}_propertiesChanged(e,t,r){}_shouldPropertyChange(e,t,r){return r!==t&&(r==r||t==t)}attributeChangedCallback(e,t,r,i){t!==r&&this._attributeToProperty(e,r),super.attributeChangedCallback&&super.attributeChangedCallback(e,t,r,i)}_attributeToProperty(e,t,r){if(!this.__serializing){let i=this.__dataAttributes,n=i&&i[e]||e;this[n]=this._deserializeValue(t,r||this.constructor.typeForProperty(n))}}_propertyToAttribute(e,t,r){this.__serializing=!0,r=arguments.length<3?this[e]:r,this._valueToNodeAttribute(this,r,t||this.constructor.attributeNameForProperty(e)),this.__serializing=!1}_valueToNodeAttribute(e,t,r){let i=this._serializeValue(t);("class"===r||"name"===r||"slot"===r)&&(e=tH(e)),void 0===i?e.removeAttribute(r):e.setAttribute(r,i)}_serializeValue(e){return"boolean"==typeof e?e?"":void 0:null!=e?e.toString():void 0}_deserializeValue(e,t){switch(t){case Boolean:return null!==e;case Number:return Number(e);default:return e}}}return t}),rn={},rs=HTMLElement.prototype;for(;rs;){let e=Object.getOwnPropertyNames(rs);for(let t=0;t<e.length;t++)rn[e[t]]=!0;rs=Object.getPrototypeOf(rs)}function ro(e,t){if(!rn[t]){let r=e[t];void 0!==r&&(e.__data?e._setPendingProperty(t,r):(e.__dataProto?e.hasOwnProperty(JSCompiler_renameProperty("__dataProto",e))||(e.__dataProto=Object.create(e.__dataProto)):e.__dataProto={},e.__dataProto[t]=r))}}let ra=tj(e=>{let t=ri(e);class r extends t{static createPropertiesForAttributes(){let e=this.observedAttributes;for(let t=0;t<e.length;t++)this.prototype._createPropertyAccessor(t1(e[t]))}static attributeNameForProperty(e){return t2(e)}_initializeProperties(){this.__dataProto&&(this._initializeProtoProperties(this.__dataProto),this.__dataProto=null),super._initializeProperties()}_initializeProtoProperties(e){for(let t in e)this._setProperty(t,e[t])}_ensureAttribute(e,t){this.hasAttribute(e)||this._valueToNodeAttribute(this,t,e)}_serializeValue(e){if("object"==typeof e){if(e instanceof Date)return e.toString();if(e)try{return JSON.stringify(e)}catch(e){return""}}return super._serializeValue(e)}_deserializeValue(e,t){let r;switch(t){case Object:try{r=JSON.parse(e)}catch(t){r=e}break;case Array:try{r=JSON.parse(e)}catch(t){r=null,console.warn(`Polymer::Attributes: couldn't decode Array as JSON: ${e}`)}break;case Date:r=isNaN(e)?String(e):Number(e),r=new Date(r);break;default:r=super._deserializeValue(e,t)}return r}_definePropertyAccessor(e,t){ro(this,e),super._definePropertyAccessor(e,t)}_hasAccessor(e){return this.__dataHasAccessor&&this.__dataHasAccessor[e]}_isPropertyPending(e){return!!(this.__dataPending&&e in this.__dataPending)}}return r}),rl={"dom-if":!0,"dom-repeat":!0},rd=!1,rc=!1;function ru(){if(!rd){rd=!0;let e=document.createElement("textarea");e.placeholder="a",rc=e.placeholder===e.textContent}return rc}function rh(e){ru()&&"textarea"===e.localName&&e.placeholder&&e.placeholder===e.textContent&&(e.textContent=null)}function rp(e){let t=e.getAttribute("is");if(t&&rl[t]){let r=e;for(r.removeAttribute("is"),e=r.ownerDocument.createElement(t),r.parentNode.replaceChild(e,r),e.appendChild(r);r.attributes.length;)e.setAttribute(r.attributes[0].name,r.attributes[0].value),r.removeAttribute(r.attributes[0].name)}return e}function rm(e,t){let r=t.parentInfo&&rm(e,t.parentInfo);if(!r)return e;for(let e=r.firstChild,i=0;e;e=e.nextSibling)if(t.parentIndex===i++)return e}function rf(e,t,r,i){i.id&&(t[i.id]=r)}function r_(e,t,r){if(r.events&&r.events.length)for(let i=0,n=r.events,s;i<n.length&&(s=n[i]);i++)e._addMethodEventListenerToNode(t,s.name,s.value,e)}function ry(e,t,r,i){r.templateInfo&&(t._templateInfo=r.templateInfo,t._parentTemplateInfo=i)}function rg(e,t,r){return e=e._methodHost||e,function(t){e[r]?e[r](t,t.detail):console.warn("listener method `"+r+"` not defined")}}let rv=tj(e=>{class t extends e{static _parseTemplate(e,t){if(!e._templateInfo){let r=e._templateInfo={};r.nodeInfoList=[],r.nestedTemplate=!!t,r.stripWhiteSpace=t&&t.stripWhiteSpace||e.hasAttribute("strip-whitespace"),this._parseTemplateContent(e,r,{parent:null})}return e._templateInfo}static _parseTemplateContent(e,t,r){return this._parseTemplateNode(e.content,t,r)}static _parseTemplateNode(e,t,r){let i=!1;return"template"!=e.localName||e.hasAttribute("preserve-content")?"slot"===e.localName&&(t.hasInsertionPoint=!0):i=this._parseTemplateNestedTemplate(e,t,r)||i,rh(e),e.firstChild&&this._parseTemplateChildNodes(e,t,r),e.hasAttributes&&e.hasAttributes()&&(i=this._parseTemplateNodeAttributes(e,t,r)||i),i||r.noted}static _parseTemplateChildNodes(e,t,r){if("script"!==e.localName&&"style"!==e.localName)for(let i=e.firstChild,n=0,s;i;i=s){if("template"==i.localName&&(i=rp(i)),s=i.nextSibling,i.nodeType===Node.TEXT_NODE){let r=s;for(;r&&r.nodeType===Node.TEXT_NODE;)i.textContent+=r.textContent,s=r.nextSibling,e.removeChild(r),r=s;if(t.stripWhiteSpace&&!i.textContent.trim()){e.removeChild(i);continue}}let o={parentIndex:n,parentInfo:r};this._parseTemplateNode(i,t,o)&&(o.infoIndex=t.nodeInfoList.push(o)-1),i.parentNode&&n++}}static _parseTemplateNestedTemplate(e,t,r){let i=this._parseTemplate(e,t);return(i.content=e.content.ownerDocument.createDocumentFragment()).appendChild(e.content),r.templateInfo=i,!0}static _parseTemplateNodeAttributes(e,t,r){let i=!1,n=Array.from(e.attributes);for(let s=n.length-1,o;o=n[s];s--)i=this._parseTemplateNodeAttribute(e,t,r,o.name,o.value)||i;return i}static _parseTemplateNodeAttribute(e,t,r,i,n){return"on-"===i.slice(0,3)?(e.removeAttribute(i),r.events=r.events||[],r.events.push({name:i.slice(3),value:n}),!0):"id"===i&&(r.id=n,!0)}static _contentForTemplate(e){let t=e._templateInfo;return t&&t.content||e.content}_stampTemplate(e,t){e&&!e.content&&window.HTMLTemplateElement&&HTMLTemplateElement.decorate&&HTMLTemplateElement.decorate(e);let r=(t=t||this.constructor._parseTemplate(e)).nodeInfoList,i=t.content||e.content,n=document.importNode(i,!0);n.__noInsertionPoint=!t.hasInsertionPoint;let s=n.nodeList=Array(r.length);n.$={};for(let e=0,i=r.length,o;e<i&&(o=r[e]);e++){let r=s[e]=rm(n,o);rf(this,n.$,r,o),ry(this,r,o,t),r_(this,r,o)}return n}_addMethodEventListenerToNode(e,t,r,i){let n=rg(i=i||e,t,r);return this._addEventListenerToNode(e,t,n),n}_addEventListenerToNode(e,t,r){e.addEventListener(t,r)}_removeEventListenerFromNode(e,t,r){e.removeEventListener(t,r)}}return t}),rb=0,rw=[],rS={COMPUTE:"__computeEffects",REFLECT:"__reflectEffects",NOTIFY:"__notifyEffects",PROPAGATE:"__propagateEffects",OBSERVE:"__observeEffects",READ_ONLY:"__readOnly"},rC="__computeInfo",rA=/[A-Z]/;function rP(e,t,r){let i=e[t];if(i){if(!e.hasOwnProperty(t)&&(i=e[t]=Object.create(e[t]),r))for(let e in i){let t=i[e],r=i[e]=Array(t.length);for(let e=0;e<t.length;e++)r[e]=t[e]}}else i=e[t]={};return i}function rx(e,t,r,i,n,s){if(t){let o=!1,a=rb++;for(let l in r){let d=t[n?tq(l):l];if(d)for(let t=0,c=d.length,u;t<c&&(u=d[t]);t++)(!u.info||u.info.lastRun!==a)&&(!n||rO(l,u.trigger))&&(u.info&&(u.info.lastRun=a),u.fn(e,l,r,i,u.info,n,s),o=!0)}return o}return!1}function rE(e,t,r,i,n,s,o,a){let l=!1,d=t[o?tq(i):i];if(d)for(let t=0,c=d.length,u;t<c&&(u=d[t]);t++)(!u.info||u.info.lastRun!==r)&&(!o||rO(i,u.trigger))&&(u.info&&(u.info.lastRun=r),u.fn(e,i,n,s,u.info,o,a),l=!0);return l}function rO(e,t){if(!t)return!0;{let r=t.name;return r==e||!!(t.structured&&tV(r,e))||!!(t.wildcard&&tW(r,e))}}function rT(e,t,r,i,n){let s="string"==typeof n.method?e[n.method]:n.method,o=n.property;s?s.call(e,e.__data[o],i[o]):n.dynamicFn||console.warn("observer method `"+n.method+"` not defined")}function rM(e,t,r,i,n){let s,o,a=e[rS.NOTIFY],l=rb++;for(let o in t)t[o]&&(a&&rE(e,a,l,o,r,i,n)?s=!0:n&&rN(e,o,r)&&(s=!0));s&&(o=e.__dataHost)&&o._invalidateProperties&&o._invalidateProperties()}function rN(e,t,r){let i=tq(t);return i!==t&&(rk(e,t2(i)+"-changed",r[t],t),!0)}function rk(e,t,r,i){let n={value:r,queueProperty:!0};i&&(n.path=i),tH(e).dispatchEvent(new CustomEvent(t,{detail:n}))}function rI(e,t,r,i,n,s){let o=(s?tq(t):t)!=t?t:null,a=o?tX(e,o):e.__data[t];o&&void 0===a&&(a=r[t]),rk(e,n.eventName,a,o)}function rL(e,t,r,i,n){let s;let o=e.detail,a=o&&o.path;a?(i=tY(r,i,a),s=o&&o.value):s=e.currentTarget[r],s=n?!s:s,!((!t[rS.READ_ONLY]||!t[rS.READ_ONLY][i])&&t._setPendingPropertyOrPath(i,s,!0,!!a))||o&&o.queueProperty||t._invalidateProperties()}function rR(e,t,r,i,n){let s=e.__data[t];O&&(s=O(s,n.attrName,"attribute",e)),e._propertyToAttribute(t,n.attrName,s)}function rF(e,t,r,i){let n=e[rS.COMPUTE];if(n){if(F){let s;rb++;let o=rB(e),a=[];for(let e in t)rz(e,n,a,o,i);for(;s=a.shift();)rH(e,"",t,r,s)&&rz(s.methodInfo,n,a,o,i);Object.assign(r,e.__dataOld),Object.assign(t,e.__dataPending),e.__dataPending=null}else{let s=t;for(;rx(e,n,s,r,i);)Object.assign(r,e.__dataOld),Object.assign(t,e.__dataPending),s=e.__dataPending,e.__dataPending=null}}}let rD=(e,t,r)=>{let i=0,n=t.length-1,s=-1;for(;i<=n;){let o=i+n>>1,a=r.get(t[o].methodInfo)-r.get(e.methodInfo);if(a<0)i=o+1;else if(a>0)n=o-1;else{s=o;break}}s<0&&(s=n+1),t.splice(s,0,e)},rz=(e,t,r,i,n)=>{let s=n?tq(e):e,o=t[s];if(o)for(let t=0;t<o.length;t++){let s=o[t];s.info.lastRun!==rb&&(!n||rO(e,s.trigger))&&(s.info.lastRun=rb,rD(s.info,r,i))}};function rB(e){let t=e.constructor.__orderedComputedDeps;if(!t){let r;t=new Map;let i=e[rS.COMPUTE],{counts:n,ready:s,total:o}=rj(e);for(;r=s.shift();){t.set(r,t.size);let e=i[r];e&&e.forEach(e=>{let t=e.info.methodInfo;--o,0==--n[t]&&s.push(t)})}0!==o&&console.warn(`Computed graph for ${e.localName} incomplete; circular?`),e.constructor.__orderedComputedDeps=t}return t}function rj(e){let t=e[rC],r={},i=e[rS.COMPUTE],n=[],s=0;for(let e in t){let i=t[e];s+=r[e]=i.args.filter(e=>!e.literal).length+(i.dynamicFn?1:0)}for(let e in i)t[e]||n.push(e);return{counts:r,ready:n,total:s}}function rH(e,t,r,i,n){let s=rQ(e,t,r,i,n);if(s===rw)return!1;let o=n.methodInfo;return e.__dataHasAccessor&&e.__dataHasAccessor[o]?e._setPendingProperty(o,s,!0):(e[o]=s,!1)}function rU(e,t,r){let i=e.__dataLinkedPaths;if(i){let n;for(let s in i){let o=i[s];tW(s,t)?(n=tY(s,o,t),e._setPendingPropertyOrPath(n,r,!0,!0)):tW(o,t)&&(n=tY(o,s,t),e._setPendingPropertyOrPath(n,r,!0,!0))}}}function rq(e,t,r,i,n,s,o){r.bindings=r.bindings||[];let a={kind:i,target:n,parts:s,literal:o,isCompound:1!==s.length};if(r.bindings.push(a),rJ(a)){let{event:e,negate:t}=a.parts[0];a.listenerEvent=e||t2(n)+"-changed",a.listenerNegate=t}let l=t.nodeInfoList.length;for(let r=0;r<a.parts.length;r++){let i=a.parts[r];i.compoundIndex=r,rV(e,t,a,i,l)}}function rV(e,t,r,i,n){if(!i.literal){if("attribute"===r.kind&&"-"===r.target[0])console.warn("Cannot set attribute "+r.target+' because "-" is not a valid attribute starting character');else{let s=i.dependencies,o={index:n,binding:r,part:i,evaluator:e};for(let r=0;r<s.length;r++){let i=s[r];"string"==typeof i&&((i=it(i)).wildcard=!0),e._addTemplatePropertyEffect(t,i.rootProperty,{fn:rW,info:o,trigger:i})}}}}function rW(e,t,r,i,n,s,o){let a=o[n.index],l=n.binding,d=n.part;if(s&&d.source&&t.length>d.source.length&&"property"==l.kind&&!l.isCompound&&a.__isPropertyEffectsClient&&a.__dataHasAccessor&&a.__dataHasAccessor[l.target]){let i=r[t];t=tY(d.source,l.target,t),a._setPendingPropertyOrPath(t,i,!1,!0)&&e._enqueueClient(a)}else{let o=n.evaluator._evaluateBinding(e,d,t,r,i,s);o!==rw&&rY(e,a,l,d,o)}}function rY(e,t,r,i,n){if(n=rG(t,n,r,i),O&&(n=O(n,r.target,r.kind,t)),"attribute"==r.kind)e._valueToNodeAttribute(t,n,r.target);else{let i=r.target;t.__isPropertyEffectsClient&&t.__dataHasAccessor&&t.__dataHasAccessor[i]?(!t[rS.READ_ONLY]||!t[rS.READ_ONLY][i])&&t._setPendingProperty(i,n)&&e._enqueueClient(t):e._setUnmanagedPropertyToNode(t,i,n)}}function rG(e,t,r,i){if(r.isCompound){let n=e.__dataCompoundStorage[r.target];n[i.compoundIndex]=t,t=n.join("")}return"attribute"!==r.kind&&("textContent"===r.target||"value"===r.target&&("input"===e.localName||"textarea"===e.localName))&&(t=void 0==t?"":t),t}function rJ(e){return!!e.target&&"attribute"!=e.kind&&"text"!=e.kind&&!e.isCompound&&"{"===e.parts[0].mode}function r$(e,t){let{nodeList:r,nodeInfoList:i}=t;if(i.length)for(let t=0;t<i.length;t++){let n=i[t],s=r[t],o=n.bindings;if(o)for(let t=0;t<o.length;t++){let r=o[t];rX(s,r),rZ(s,e,r)}s.__dataHost=e}}function rX(e,t){if(t.isCompound){let r=e.__dataCompoundStorage||(e.__dataCompoundStorage={}),i=t.parts,n=Array(i.length);for(let e=0;e<i.length;e++)n[e]=i[e].literal;let s=t.target;r[s]=n,t.literal&&"property"==t.kind&&("className"===s&&(e=tH(e)),e[s]=t.literal)}}function rZ(e,t,r){if(r.listenerEvent){let i=r.parts[0];e.addEventListener(r.listenerEvent,function(e){rL(e,t,r.target,i.source,i.negate)})}}function rK(e,t,r,i,n,s){s=t.static||s&&("object"!=typeof s||s[t.methodName]);let o={methodName:t.methodName,args:t.args,methodInfo:n,dynamicFn:s};for(let n=0,s;n<t.args.length&&(s=t.args[n]);n++)s.literal||e._addPropertyEffect(s.rootProperty,r,{fn:i,info:o,trigger:s});return s&&e._addPropertyEffect(t.methodName,r,{fn:i,info:o}),o}function rQ(e,t,r,i,n){let s=e._methodHost||e,o=s[n.methodName];if(o){let i=e._marshalArgs(n.args,t,r);return i===rw?rw:o.apply(s,i)}n.dynamicFn||console.warn("method `"+n.methodName+"` not defined")}let r0=[],r1="(?:[a-zA-Z_$][\\w.:$\\-*]*)",r2="(?:("+r1+"|(?:[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)|(?:(?:'(?:[^'\\\\]|\\\\.)*')|(?:\"(?:[^\"\\\\]|\\\\.)*\")))\\s*)",r4="(?:"+r2+"(?:,\\s*"+r2+")*)",r5="(?:\\(\\s*(?:"+r4+"?)\\)\\s*)",r3="("+r1+"\\s*"+r5+"?)",r6="(\\[\\[|{{)\\s*(?:(!)\\s*)?"+r3+"(?:]]|}})",r7=RegExp(r6,"g");function r9(e){let t="";for(let r=0;r<e.length;r++)t+=e[r].literal||"";return t}function r8(e){let t=e.match(/([^\s]+?)\(([\s\S]*)\)/);if(t){let e={methodName:t[1],static:!0,args:r0};return t[2].trim()?ie(t[2].replace(/\\,/g,"&comma;").split(","),e):e}return null}function ie(e,t){return t.args=e.map(function(e){let r=it(e);return r.literal||(t.static=!1),r},this),t}function it(e){let t=e.trim().replace(/&comma;/g,",").replace(/\\(.)/g,"$1"),r={name:t,value:"",literal:!1},i=t[0];switch("-"===i&&(i=t[1]),i>="0"&&i<="9"&&(i="#"),i){case"'":case'"':r.value=t.slice(1,-1),r.literal=!0;break;case"#":r.value=Number(t),r.literal=!0}return!r.literal&&(r.rootProperty=tq(t),r.structured=tU(t),r.structured&&(r.wildcard=".*"==t.slice(-2),r.wildcard&&(r.name=t.slice(0,-2)))),r}function ir(e,t,r){let i=tX(e,r);return void 0===i&&(i=t[r]),i}function ii(e,t,r,i){let n={indexSplices:i};R&&!e._overrideLegacyUndefined&&(t.splices=n),e.notifyPath(r+".splices",n),e.notifyPath(r+".length",t.length),R&&!e._overrideLegacyUndefined&&(n.indexSplices=[])}function is(e,t,r,i,n,s){ii(e,t,r,[{index:i,addedCount:n,removed:s,object:t,type:"splice"}])}function io(e){return e[0].toUpperCase()+e.substring(1)}let ia=tj(e=>{let t=rv(ra(e));class r extends t{constructor(){super(),this.__isPropertyEffectsClient=!0,this.__dataClientsReady,this.__dataPendingClients,this.__dataToNotify,this.__dataLinkedPaths,this.__dataHasPaths,this.__dataCompoundStorage,this.__dataHost,this.__dataTemp,this.__dataClientsInitialized,this.__data,this.__dataPending,this.__dataOld,this.__computeEffects,this.__computeInfo,this.__reflectEffects,this.__notifyEffects,this.__propagateEffects,this.__observeEffects,this.__readOnly,this.__templateInfo,this._overrideLegacyUndefined}get PROPERTY_EFFECT_TYPES(){return rS}_initializeProperties(){super._initializeProperties(),this._registerHost(),this.__dataClientsReady=!1,this.__dataPendingClients=null,this.__dataToNotify=null,this.__dataLinkedPaths=null,this.__dataHasPaths=!1,this.__dataCompoundStorage=this.__dataCompoundStorage||null,this.__dataHost=this.__dataHost||null,this.__dataTemp={},this.__dataClientsInitialized=!1}_registerHost(){if(il.length){let e=il[il.length-1];e._enqueueClient(this),this.__dataHost=e}}_initializeProtoProperties(e){this.__data=Object.create(e),this.__dataPending=Object.create(e),this.__dataOld={}}_initializeInstanceProperties(e){let t=this[rS.READ_ONLY];for(let r in e)t&&t[r]||(this.__dataPending=this.__dataPending||{},this.__dataOld=this.__dataOld||{},this.__data[r]=this.__dataPending[r]=e[r])}_addPropertyEffect(e,t,r){this._createPropertyAccessor(e,t==rS.READ_ONLY);let i=rP(this,t,!0)[e];i||(i=this[t][e]=[]),i.push(r)}_removePropertyEffect(e,t,r){let i=rP(this,t,!0)[e],n=i.indexOf(r);n>=0&&i.splice(n,1)}_hasPropertyEffect(e,t){let r=this[t];return!!(r&&r[e])}_hasReadOnlyEffect(e){return this._hasPropertyEffect(e,rS.READ_ONLY)}_hasNotifyEffect(e){return this._hasPropertyEffect(e,rS.NOTIFY)}_hasReflectEffect(e){return this._hasPropertyEffect(e,rS.REFLECT)}_hasComputedEffect(e){return this._hasPropertyEffect(e,rS.COMPUTE)}_setPendingPropertyOrPath(e,t,r,i){if(i||tq(Array.isArray(e)?e[0]:e)!==e){if(!i){let r=tX(this,e);if(!(e=tZ(this,e,t))||!super._shouldPropertyChange(e,t,r))return!1}if(this.__dataHasPaths=!0,this._setPendingProperty(e,t,r))return rU(this,e,t),!0}else{if(this.__dataHasAccessor&&this.__dataHasAccessor[e])return this._setPendingProperty(e,t,r);this[e]=t}return!1}_setUnmanagedPropertyToNode(e,t,r){(r!==e[t]||"object"==typeof r)&&("className"===t&&(e=tH(e)),e[t]=r)}_setPendingProperty(e,t,r){let i=this.__dataHasPaths&&tU(e),n=i?this.__dataTemp:this.__data;return!!this._shouldPropertyChange(e,t,n[e])&&(this.__dataPending||(this.__dataPending={},this.__dataOld={}),e in this.__dataOld||(this.__dataOld[e]=this.__data[e]),i?this.__dataTemp[e]=t:this.__data[e]=t,this.__dataPending[e]=t,(i||this[rS.NOTIFY]&&this[rS.NOTIFY][e])&&(this.__dataToNotify=this.__dataToNotify||{},this.__dataToNotify[e]=r),!0)}_setProperty(e,t){this._setPendingProperty(e,t,!0)&&this._invalidateProperties()}_invalidateProperties(){this.__dataReady&&this._flushProperties()}_enqueueClient(e){this.__dataPendingClients=this.__dataPendingClients||[],e!==this&&this.__dataPendingClients.push(e)}_flushClients(){this.__dataClientsReady?this.__enableOrFlushClients():(this.__dataClientsReady=!0,this._readyClients(),this.__dataReady=!0)}__enableOrFlushClients(){let e=this.__dataPendingClients;if(e){this.__dataPendingClients=null;for(let t=0;t<e.length;t++){let r=e[t];r.__dataEnabled?r.__dataPending&&r._flushProperties():r._enableProperties()}}}_readyClients(){this.__enableOrFlushClients()}setProperties(e,t){for(let r in e)!t&&this[rS.READ_ONLY]&&this[rS.READ_ONLY][r]||this._setPendingPropertyOrPath(r,e[r],!0);this._invalidateProperties()}ready(){this._flushProperties(),this.__dataClientsReady||this._flushClients(),this.__dataPending&&this._flushProperties()}_propertiesChanged(e,t,r){let i,n=this.__dataHasPaths;this.__dataHasPaths=!1,rF(this,t,r,n),i=this.__dataToNotify,this.__dataToNotify=null,this._propagatePropertyChanges(t,r,n),this._flushClients(),rx(this,this[rS.REFLECT],t,r,n),rx(this,this[rS.OBSERVE],t,r,n),i&&rM(this,i,t,r,n),1==this.__dataCounter&&(this.__dataTemp={})}_propagatePropertyChanges(e,t,r){this[rS.PROPAGATE]&&rx(this,this[rS.PROPAGATE],e,t,r),this.__templateInfo&&this._runEffectsForTemplate(this.__templateInfo,e,t,r)}_runEffectsForTemplate(e,t,r,i){let n=(t,i)=>{rx(this,e.propertyEffects,t,r,i,e.nodeList);for(let n=e.firstChild;n;n=n.nextSibling)this._runEffectsForTemplate(n,t,r,i)};e.runEffects?e.runEffects(n,t,i):n(t,i)}linkPaths(e,t){e=tJ(e),t=tJ(t),this.__dataLinkedPaths=this.__dataLinkedPaths||{},this.__dataLinkedPaths[e]=t}unlinkPaths(e){e=tJ(e),this.__dataLinkedPaths&&delete this.__dataLinkedPaths[e]}notifySplices(e,t){let r={path:""};ii(this,tX(this,e,r),r.path,t)}get(e,t){return tX(t||this,e)}set(e,t,r){r?tZ(r,e,t):(!this[rS.READ_ONLY]||!this[rS.READ_ONLY][e])&&this._setPendingPropertyOrPath(e,t,!0)&&this._invalidateProperties()}push(e,...t){let r={path:""},i=tX(this,e,r),n=i.length,s=i.push(...t);return t.length&&is(this,i,r.path,n,t.length,[]),s}pop(e){let t={path:""},r=tX(this,e,t),i=!!r.length,n=r.pop();return i&&is(this,r,t.path,r.length,0,[n]),n}splice(e,t,r,...i){let n,s={path:""},o=tX(this,e,s);return t<0?t=o.length-Math.floor(-t):t&&(t=Math.floor(t)),n=2==arguments.length?o.splice(t):o.splice(t,r,...i),(i.length||n.length)&&is(this,o,s.path,t,i.length,n),n}shift(e){let t={path:""},r=tX(this,e,t),i=!!r.length,n=r.shift();return i&&is(this,r,t.path,0,0,[n]),n}unshift(e,...t){let r={path:""},i=tX(this,e,r),n=i.unshift(...t);return t.length&&is(this,i,r.path,0,t.length,[]),n}notifyPath(e,t){let r;if(1==arguments.length){let i={path:""};t=tX(this,e,i),r=i.path}else r=Array.isArray(e)?tJ(e):e;this._setPendingPropertyOrPath(r,t,!0,!0)&&this._invalidateProperties()}_createReadOnlyProperty(e,t){this._addPropertyEffect(e,rS.READ_ONLY),t&&(this["_set"+io(e)]=function(t){this._setProperty(e,t)})}_createPropertyObserver(e,t,r){let i={property:e,method:t,dynamicFn:!!r};this._addPropertyEffect(e,rS.OBSERVE,{fn:rT,info:i,trigger:{name:e}}),r&&this._addPropertyEffect(t,rS.OBSERVE,{fn:rT,info:i,trigger:{name:t}})}_createMethodObserver(e,t){let r=r8(e);if(!r)throw Error("Malformed observer expression '"+e+"'");rK(this,r,rS.OBSERVE,rQ,null,t)}_createNotifyingProperty(e){this._addPropertyEffect(e,rS.NOTIFY,{fn:rI,info:{eventName:t2(e)+"-changed",property:e}})}_createReflectedProperty(e){let t=this.constructor.attributeNameForProperty(e);"-"===t[0]?console.warn("Property "+e+" cannot be reflected to attribute "+t+' because "-" is not a valid starting attribute name. Use a lowercase first letter for the property instead.'):this._addPropertyEffect(e,rS.REFLECT,{fn:rR,info:{attrName:t}})}_createComputedProperty(e,t,r){let i=r8(t);if(!i)throw Error("Malformed computed expression '"+t+"'");let n=rK(this,i,rS.COMPUTE,rH,e,r);rP(this,rC)[e]=n}_marshalArgs(e,t,r){let i=this.__data,n=[];for(let s=0,o=e.length;s<o;s++){let{name:o,structured:a,wildcard:l,value:d,literal:c}=e[s];if(!c){if(l){let e=tW(o,t),n=ir(i,r,e?t:o);d={path:e?t:o,value:n,base:e?tX(i,o):n}}else d=a?ir(i,r,o):i[o]}if(R&&!this._overrideLegacyUndefined&&void 0===d&&e.length>1)return rw;n[s]=d}return n}static addPropertyEffect(e,t,r){this.prototype._addPropertyEffect(e,t,r)}static createPropertyObserver(e,t,r){this.prototype._createPropertyObserver(e,t,r)}static createMethodObserver(e,t){this.prototype._createMethodObserver(e,t)}static createNotifyingProperty(e){this.prototype._createNotifyingProperty(e)}static createReadOnlyProperty(e,t){this.prototype._createReadOnlyProperty(e,t)}static createReflectedProperty(e){this.prototype._createReflectedProperty(e)}static createComputedProperty(e,t,r){this.prototype._createComputedProperty(e,t,r)}static bindTemplate(e){return this.prototype._bindTemplate(e)}_bindTemplate(e,t){let r=this.constructor._parseTemplate(e),i=this.__preBoundTemplateInfo==r;if(!i)for(let e in r.propertyEffects)this._createPropertyAccessor(e);if(t){if((r=Object.create(r)).wasPreBound=i,this.__templateInfo){let t=e._parentTemplateInfo||this.__templateInfo,i=t.lastChild;r.parent=t,t.lastChild=r,r.previousSibling=i,i?i.nextSibling=r:t.firstChild=r}else this.__templateInfo=r}else this.__preBoundTemplateInfo=r;return r}static _addTemplatePropertyEffect(e,t,r){(e.hostProps=e.hostProps||{})[t]=!0;let i=e.propertyEffects=e.propertyEffects||{};(i[t]=i[t]||[]).push(r)}_stampTemplate(e,t){t=t||this._bindTemplate(e,!0),il.push(this);let r=super._stampTemplate(e,t);if(il.pop(),t.nodeList=r.nodeList,!t.wasPreBound){let e=t.childNodes=[];for(let t=r.firstChild;t;t=t.nextSibling)e.push(t)}return r.templateInfo=t,r$(this,t),this.__dataClientsReady&&(this._runEffectsForTemplate(t,this.__data,null,!1),this._flushClients()),r}_removeBoundDom(e){let t=e.templateInfo,{previousSibling:r,nextSibling:i,parent:n}=t;r?r.nextSibling=i:n&&(n.firstChild=i),i?i.previousSibling=r:n&&(n.lastChild=r),t.nextSibling=t.previousSibling=null;let s=t.childNodes;for(let e=0;e<s.length;e++){let t=s[e];tH(tH(t).parentNode).removeChild(t)}}static _parseTemplateNode(e,r,i){let n=t._parseTemplateNode.call(this,e,r,i);if(e.nodeType===Node.TEXT_NODE){let t=this._parseBindings(e.textContent,r);t&&(e.textContent=r9(t)||" ",rq(this,r,i,"text","textContent",t),n=!0)}return n}static _parseTemplateNodeAttribute(e,r,i,n,s){let o=this._parseBindings(s,r);if(!o)return t._parseTemplateNodeAttribute.call(this,e,r,i,n,s);{let t=n,s="property";rA.test(n)?s="attribute":"$"==n[n.length-1]&&(n=n.slice(0,-1),s="attribute");let a=r9(o);return a&&"attribute"==s&&("class"==n&&e.hasAttribute("class")&&(a+=" "+e.getAttribute(n)),e.setAttribute(n,a)),"attribute"==s&&"disable-upgrade$"==t&&e.setAttribute(n,""),"input"===e.localName&&"value"===t&&e.setAttribute(t,""),e.removeAttribute(t),"property"===s&&(n=t1(n)),rq(this,r,i,s,n,o,a),!0}}static _parseTemplateNestedTemplate(e,r,i){let n=t._parseTemplateNestedTemplate.call(this,e,r,i),s=e.parentNode,o=i.templateInfo,a="dom-if"===s.localName,l="dom-repeat"===s.localName;z&&(a||l)&&(s.removeChild(e),(i=i.parentInfo).templateInfo=o,i.noted=!0,n=!1);let d=o.hostProps;if(B&&a)d&&(r.hostProps=Object.assign(r.hostProps||{},d),z||(i.parentInfo.noted=!0));else for(let e in d){let t=[{mode:"{",source:e,dependencies:[e],hostProp:!0}];rq(this,r,i,"property","_host_"+e,t)}return n}static _parseBindings(e,t){let r,i=[],n=0;for(;null!==(r=r7.exec(e));){r.index>n&&i.push({literal:e.slice(n,r.index)});let s=r[1][0],o=!!r[2],a=r[3].trim(),l=!1,d="",c=-1;"{"==s&&(c=a.indexOf("::"))>0&&(d=a.substring(c+2),a=a.substring(0,c),l=!0);let u=r8(a),h=[];if(u){let{args:e,methodName:r}=u;for(let t=0;t<e.length;t++){let r=e[t];r.literal||h.push(r)}let i=t.dynamicFns;(i&&i[r]||u.static)&&(h.push(r),u.dynamicFn=!0)}else h.push(a);i.push({source:a,mode:s,negate:o,customEvent:l,signature:u,dependencies:h,event:d}),n=r7.lastIndex}if(n&&n<e.length){let t=e.substring(n);t&&i.push({literal:t})}return i.length?i:null}static _evaluateBinding(e,t,r,i,n,s){let o;return o=t.signature?rQ(e,r,i,n,t.signature):r!=t.source?tX(e,t.source):s&&tU(r)?tX(e,r):e.__data[r],t.negate&&(o=!o),o}}return r}),il=[],id=0;function ic(){id++}let iu=[];function ih(e){iu.push(e)}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/function ip(e){let t={};for(let r in e){let i=e[r];t[r]="function"==typeof i?{type:i}:i}return t}let im=tj(e=>{let t=ri(e);function r(e){let t=Object.getPrototypeOf(e);return t.prototype instanceof n?t:null}function i(e){if(!e.hasOwnProperty(JSCompiler_renameProperty("__ownProperties",e))){let t=null;if(e.hasOwnProperty(JSCompiler_renameProperty("properties",e))){let r=e.properties;r&&(t=ip(r))}e.__ownProperties=t}return e.__ownProperties}class n extends t{static get observedAttributes(){if(!this.hasOwnProperty(JSCompiler_renameProperty("__observedAttributes",this))){ih(this.prototype);let e=this._properties;this.__observedAttributes=e?Object.keys(e).map(e=>this.prototype._addPropertyToAttributeMap(e)):[]}return this.__observedAttributes}static finalize(){if(!this.hasOwnProperty(JSCompiler_renameProperty("__finalized",this))){let e=r(this);e&&e.finalize(),this.__finalized=!0,this._finalizeClass()}}static _finalizeClass(){let e=i(this);e&&this.createProperties(e)}static get _properties(){if(!this.hasOwnProperty(JSCompiler_renameProperty("__properties",this))){let e=r(this);this.__properties=Object.assign({},e&&e._properties,i(this))}return this.__properties}static typeForProperty(e){let t=this._properties[e];return t&&t.type}_initializeProperties(){ic(),this.constructor.finalize(),super._initializeProperties()}connectedCallback(){super.connectedCallback&&super.connectedCallback(),this._enableProperties()}disconnectedCallback(){super.disconnectedCallback&&super.disconnectedCallback()}}return n}),i_=window.ShadyCSS&&window.ShadyCSS.cssBuild,iy=tj(e=>{let t=im(ia(e));function r(e){if(!e.hasOwnProperty(JSCompiler_renameProperty("__propertyDefaults",e))){e.__propertyDefaults=null;let t=e._properties;for(let r in t){let i=t[r];"value"in i&&(e.__propertyDefaults=e.__propertyDefaults||{},e.__propertyDefaults[r]=i)}}return e.__propertyDefaults}function i(e){return e.hasOwnProperty(JSCompiler_renameProperty("__ownObservers",e))||(e.__ownObservers=e.hasOwnProperty(JSCompiler_renameProperty("observers",e))?e.observers:null),e.__ownObservers}function n(e,t,r,i){r.computed&&(r.readOnly=!0),r.computed&&(e._hasReadOnlyEffect(t)?console.warn(`Cannot redefine computed property '${t}'.`):e._createComputedProperty(t,r.computed,i)),r.readOnly&&!e._hasReadOnlyEffect(t)?e._createReadOnlyProperty(t,!r.computed):!1===r.readOnly&&e._hasReadOnlyEffect(t)&&console.warn(`Cannot make readOnly property '${t}' non-readOnly.`),r.reflectToAttribute&&!e._hasReflectEffect(t)?e._createReflectedProperty(t):!1===r.reflectToAttribute&&e._hasReflectEffect(t)&&console.warn(`Cannot make reflected property '${t}' non-reflected.`),r.notify&&!e._hasNotifyEffect(t)?e._createNotifyingProperty(t):!1===r.notify&&e._hasNotifyEffect(t)&&console.warn(`Cannot make notify property '${t}' non-notify.`),r.observer&&e._createPropertyObserver(t,r.observer,i[r.observer]),e._addPropertyToAttributeMap(t)}function s(e,t,r,i){if(!i_){let n=t.content.querySelectorAll("style"),s=tb(t),o=tw(r),a=t.content.firstElementChild;for(let r=0;r<o.length;r++){let n=o[r];n.textContent=e._processStyleText(n.textContent,i),t.content.insertBefore(n,a)}let l=0;for(let t=0;t<s.length;t++){let r=s[t],o=n[l];o!==r?(r=r.cloneNode(!0),o.parentNode.insertBefore(r,o)):l++,r.textContent=e._processStyleText(r.textContent,i)}}if(window.ShadyCSS&&window.ShadyCSS.prepareTemplate(t,r),U&&i_&&x){let r=t.content.querySelectorAll("style");if(r){let t="";Array.from(r).forEach(e=>{t+=e.textContent,e.parentNode.removeChild(e)}),e._styleSheet=new CSSStyleSheet,e._styleSheet.replaceSync(t)}}}function o(e){let t=null;if(e&&(!M||N)&&(t=J.import(e,"template"),M&&!t))throw Error(`strictTemplatePolicy: expecting dom-module or null template for ${e}`);return t}class a extends t{static get polymerElementVersion(){return"3.4.1"}static _finalizeClass(){t._finalizeClass.call(this);let e=i(this);e&&this.createObservers(e,this._properties),this._prepareTemplate()}static _prepareTemplate(){let e=this.template;e&&("string"==typeof e?(console.error("template getter must return HTMLTemplateElement"),e=null):k||(e=e.cloneNode(!0))),this.prototype._template=e}static createProperties(e){for(let t in e)n(this.prototype,t,e[t],e)}static createObservers(e,t){let r=this.prototype;for(let i=0;i<e.length;i++)r._createMethodObserver(e[i],t)}static get template(){if(!this.hasOwnProperty(JSCompiler_renameProperty("_template",this))){let e=this.prototype.hasOwnProperty(JSCompiler_renameProperty("_template",this.prototype))?this.prototype._template:void 0;this._template=void 0!==e?e:this.hasOwnProperty(JSCompiler_renameProperty("is",this))&&o(this.is)||Object.getPrototypeOf(this.prototype).constructor.template}return this._template}static set template(e){this._template=e}static get importPath(){if(!this.hasOwnProperty(JSCompiler_renameProperty("_importPath",this))){let e=this.importMeta;if(e)this._importPath=A(e.url);else{let e=J.import(this.is);this._importPath=e&&e.assetpath||Object.getPrototypeOf(this.prototype).constructor.importPath}}return this._importPath}constructor(){super(),this._template,this._importPath,this.rootPath,this.importPath,this.root,this.$}_initializeProperties(){this.constructor.finalize(),this.constructor._finalizeTemplate(this.localName),super._initializeProperties(),this.rootPath=E,this.importPath=this.constructor.importPath;let e=r(this.constructor);if(e)for(let t in e){let r=e[t];if(this._canApplyPropertyDefault(t)){let e="function"==typeof r.value?r.value.call(this):r.value;this._hasAccessor(t)?this._setPendingProperty(t,e,!0):this[t]=e}}}_canApplyPropertyDefault(e){return!this.hasOwnProperty(e)}static _processStyleText(e,t){return C(e,t)}static _finalizeTemplate(e){let t=this.prototype._template;if(t&&!t.__polymerFinalized){t.__polymerFinalized=!0;let r=this.importPath,i=r?S(r):"";s(this,t,e,i),this.prototype._bindTemplate(t)}}connectedCallback(){window.ShadyCSS&&this._template&&window.ShadyCSS.styleElement(this),super.connectedCallback()}ready(){this._template&&(this.root=this._stampTemplate(this._template),this.$=this.root.$),super.ready()}_readyClients(){this._template&&(this.root=this._attachDom(this.root)),super._readyClients()}_attachDom(e){let t=tH(this);if(t.attachShadow)return e?(!t.shadowRoot&&(t.attachShadow({mode:"open",shadyUpgradeFragment:e}),t.shadowRoot.appendChild(e),this.constructor._styleSheet&&(t.shadowRoot.adoptedStyleSheets=[this.constructor._styleSheet])),L&&window.ShadyDOM&&window.ShadyDOM.flushInitial(t.shadowRoot),t.shadowRoot):null;throw Error("ShadowDOM not available. PolymerElement can create dom as children instead of in ShadowDOM by setting `this.root = this;` before `ready`.")}updateStyles(e){window.ShadyCSS&&window.ShadyCSS.styleSubtree(this,e)}resolveUrl(e,t){return!t&&this.importPath&&(t=S(this.importPath)),S(e,t)}static _parseTemplateContent(e,r,i){return r.dynamicFns=r.dynamicFns||this._properties,t._parseTemplateContent.call(this,e,r,i)}static _addTemplatePropertyEffect(e,r,i){return!I||r in this._properties||i.info.part.signature&&i.info.part.signature.static||i.info.part.hostProp||e.nestedTemplate||console.warn(`Property '${r}' used in template but not declared in 'properties'; attribute will not be observed.`),t._addTemplatePropertyEffect.call(this,e,r,i)}}return a});/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/class ig{constructor(e){this.value=e.toString()}toString(){return this.value}}function iv(e){if(e instanceof ig)return e.value;throw Error(`non-literal value passed to Polymer's htmlLiteral function: ${e}`)}function ib(e){if(e instanceof HTMLTemplateElement)return e.innerHTML;if(e instanceof ig)return iv(e);throw Error(`non-template value passed to Polymer's html function: ${e}`)}let iw=function(e,...t){let r=document.createElement("template");return r.innerHTML=t.reduce((t,r,i)=>t+ib(r)+e[i+1],e[0]),r},iS=iy(HTMLElement),iC=e=>class extends e{static get properties(){return{theme:{type:String,readOnly:!0}}}attributeChangedCallback(e,t,r){super.attributeChangedCallback(e,t,r),"theme"===e&&this._setTheme(r)}},iA=e=>class extends iC(e){static finalize(){super.finalize();let e=this.prototype._template,t=this.template&&this.template.parentElement&&this.template.parentElement.id===this.is,r=Object.getPrototypeOf(this.prototype)._template;r&&!t&&Array.from(r.content.querySelectorAll("style[include]")).forEach(t=>{this._includeStyle(t.getAttribute("include"),e)}),this._includeMatchingThemes(e)}static _includeMatchingThemes(e){let t=J.prototype.modules,r=!1,i=this.is+"-default-theme";Object.keys(t).sort((e,t)=>{let r=0===e.indexOf("vaadin-"),i=0===t.indexOf("vaadin-"),n=["lumo-","material-"],s=n.filter(t=>0===e.indexOf(t)).length>0,o=n.filter(e=>0===t.indexOf(e)).length>0;return r!==i?r?-1:1:s!==o?s?-1:1:0}).forEach(n=>{if(n!==i){let i=t[n].getAttribute("theme-for");i&&i.split(" ").forEach(t=>{RegExp("^"+t.split("*").join(".*")+"$").test(this.is)&&(r=!0,this._includeStyle(n,e))})}}),!r&&t[i]&&this._includeStyle(i,e)}static _includeStyle(e,t){if(t&&!t.content.querySelector(`style[include="${e}"]`)){let r=document.createElement("style");r.setAttribute("include",e),t.content.appendChild(r)}}};/**
@license
Copyright (c) 2020 Vaadin Ltd.
This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
*/class iP{static detectScrollType(){let e=document.createElement("div");e.textContent="ABCD",e.dir="rtl",e.style.fontSize="14px",e.style.width="4px",e.style.height="1px",e.style.position="absolute",e.style.top="-1000px",e.style.overflow="scroll",document.body.appendChild(e);let t="reverse";return e.scrollLeft>0?t="default":(e.scrollLeft=2,e.scrollLeft<2&&(t="negative")),document.body.removeChild(e),t}static getNormalizedScrollLeft(e,t,r){let{scrollLeft:i}=r;if("rtl"!==t||!e)return i;switch(e){case"negative":return r.scrollWidth-r.clientWidth+i;case"reverse":return r.scrollWidth-r.clientWidth-i}return i}static setNormalizedScrollLeft(e,t,r,i){if("rtl"!==t||!e){r.scrollLeft=i;return}switch(e){case"negative":r.scrollLeft=r.clientWidth-r.scrollWidth+i;break;case"reverse":r.scrollLeft=r.scrollWidth-r.clientWidth-i;break;default:r.scrollLeft=i}}}let ix=[],iE=function(){let e=iM();ix.forEach(t=>{iT(t,e)})},iO=new MutationObserver(iE);iO.observe(document.documentElement,{attributes:!0,attributeFilter:["dir"]});let iT=function(e,t){t?e.setAttribute("dir",t):e.removeAttribute("dir")},iM=function(){return document.documentElement.getAttribute("dir")},iN=e=>class extends e{static get properties(){return{dir:{type:String,readOnly:!0}}}static finalize(){super.finalize(),s||(s=iP.detectScrollType())}connectedCallback(){super.connectedCallback(),this.hasAttribute("dir")||(this.__subscribe(),iT(this,iM()))}attributeChangedCallback(e,t,r){if(super.attributeChangedCallback(e,t,r),"dir"!==e)return;let i=r===iM()&&-1===ix.indexOf(this),n=!r&&t&&-1===ix.indexOf(this),s=r!==iM()&&t===iM();i||n?(this.__subscribe(),iT(this,iM())):s&&this.__subscribe(!1)}disconnectedCallback(){super.disconnectedCallback(),this.__subscribe(!1),this.removeAttribute("dir")}__subscribe(e=!0){e?-1===ix.indexOf(this)&&ix.push(this):ix.indexOf(this)>-1&&ix.splice(ix.indexOf(this),1)}__getNormalizedScrollLeft(e){return iP.getNormalizedScrollLeft(s,this.getAttribute("dir")||"ltr",e)}__setNormalizedScrollLeft(e,t){return iP.setNormalizedScrollLeft(s,this.getAttribute("dir")||"ltr",e,t)}},ik=e=>class extends e{static get properties(){return{_hasVaadinItemMixin:{value:!0},disabled:{type:Boolean,value:!1,observer:"_disabledChanged",reflectToAttribute:!0},selected:{type:Boolean,value:!1,reflectToAttribute:!0,observer:"_selectedChanged"},_value:String}}get value(){return void 0!==this._value?this._value:this.textContent.trim()}set value(e){this._value=e}ready(){super.ready();let e=this.getAttribute("value");null!==e&&(this.value=e),this.addEventListener("focus",()=>this._setFocused(!0),!0),this.addEventListener("blur",()=>this._setFocused(!1),!0),this.addEventListener("mousedown",()=>{this._setActive(this._mousedown=!0);let e=()=>{this._setActive(this._mousedown=!1),document.removeEventListener("mouseup",e)};document.addEventListener("mouseup",e)}),this.addEventListener("keydown",e=>this._onKeydown(e)),this.addEventListener("keyup",e=>this._onKeyup(e))}disconnectedCallback(){super.disconnectedCallback(),this.hasAttribute("active")&&this._setFocused(!1)}_selectedChanged(e){this.setAttribute("aria-selected",e)}_disabledChanged(e){e?(this.selected=!1,this.setAttribute("aria-disabled","true"),this.blur()):this.removeAttribute("aria-disabled")}_setFocused(e){e?(this.setAttribute("focused",""),this._mousedown||this.setAttribute("focus-ring","")):(this.removeAttribute("focused"),this.removeAttribute("focus-ring"),this._setActive(!1))}_setActive(e){e?this.setAttribute("active",""):this.removeAttribute("active")}_onKeydown(e){/^( |SpaceBar|Enter)$/.test(e.key)&&!e.defaultPrevented&&(e.preventDefault(),this._setActive(!0))}_onKeyup(){this.hasAttribute("active")&&(this._setActive(!1),this.click())}};/**
 * @license
 * Copyright (c) 2020 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */class iI extends ik(iA(iN(iS))){static get template(){return iw`
      <style>
        :host {
          display: inline-block;
        }

        :host([hidden]) {
          display: none !important;
        }
      </style>
      <div part="content">
        <slot></slot>
      </div>
    `}static get is(){return"vaadin-item"}static get version(){return"3.0.0"}constructor(){super(),this.value}}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/function iL(e,t,r){return{index:e,removed:t,addedCount:r}}function iR(e,t,r,i,n,s){let o=s-n+1,a=r-t+1,l=Array(o);for(let e=0;e<o;e++)l[e]=Array(a),l[e][0]=e;for(let e=0;e<a;e++)l[0][e]=e;for(let r=1;r<o;r++)for(let s=1;s<a;s++)if(iH(e[t+s-1],i[n+r-1]))l[r][s]=l[r-1][s-1];else{let e=l[r-1][s]+1,t=l[r][s-1]+1;l[r][s]=e<t?e:t}return l}function iF(e){let t=e.length-1,r=e[0].length-1,i=e[t][r],n=[];for(;t>0||r>0;){let s;if(0==t){n.push(2),r--;continue}if(0==r){n.push(3),t--;continue}let o=e[t-1][r-1],a=e[t-1][r],l=e[t][r-1];(s=a<l?a<o?a:o:l<o?l:o)==o?(o==i?n.push(0):(n.push(1),i=o),t--,r--):s==a?(n.push(3),t--,i=a):(n.push(2),r--,i=l)}return n.reverse(),n}function iD(e,t,r,i,n,s){let o,a=0,l=0,d=Math.min(r-t,s-n);if(0==t&&0==n&&(a=iz(e,i,d)),r==e.length&&s==i.length&&(l=iB(e,i,d-a)),t+=a,n+=a,r-=l,s-=l,r-t==0&&s-n==0)return[];if(t==r){for(o=iL(t,[],0);n<s;)o.removed.push(i[n++]);return[o]}if(n==s)return[iL(t,[],r-t)];let c=iF(iR(e,t,r,i,n,s));o=void 0;let u=[],h=t,p=n;for(let e=0;e<c.length;e++)switch(c[e]){case 0:o&&(u.push(o),o=void 0),h++,p++;break;case 1:o||(o=iL(h,[],0)),o.addedCount++,h++,o.removed.push(i[p]),p++;break;case 2:o||(o=iL(h,[],0)),o.addedCount++,h++;break;case 3:o||(o=iL(h,[],0)),o.removed.push(i[p]),p++}return o&&u.push(o),u}function iz(e,t,r){for(let i=0;i<r;i++)if(!iH(e[i],t[i]))return i;return r}function iB(e,t,r){let i=e.length,n=t.length,s=0;for(;s<r&&iH(e[--i],t[--n]);)s++;return s}function ij(e,t){return iD(e,0,e.length,t,0,t.length)}function iH(e,t){return e===t}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/function iU(e){return"slot"===e.localName}customElements.define(iI.is,iI),e5("vaadin-list-box",eQ`
    :host {
      -webkit-tap-highlight-color: transparent;
      --_lumo-item-selected-icon-display: var(--_lumo-list-box-item-selected-icon-display, block);
    }

    /* Normal item */
    [part='items'] ::slotted(vaadin-item) {
      -webkit-tap-highlight-color: var(--lumo-primary-color-10pct);
      cursor: default;
    }

    [part='items'] ::slotted(vaadin-item) {
      outline: none;
      border-radius: var(--lumo-border-radius);
      padding-left: var(--_lumo-list-box-item-padding-left, calc(var(--lumo-border-radius) / 4));
      padding-right: calc(var(--lumo-space-l) + var(--lumo-border-radius) / 4);
    }

    /* Workaround to display checkmark in IE11 when list-box is not used in dropdown-menu */
    [part='items'] ::slotted(vaadin-item)::before {
      display: var(--_lumo-item-selected-icon-display);
    }

    /* Hovered item */
    /* TODO a workaround until we have "focus-follows-mouse". After that, use the hover style for focus-ring as well */
    [part='items'] ::slotted(vaadin-item:hover:not([disabled])) {
      background-color: var(--lumo-primary-color-10pct);
    }

    /* Focused item */
    [part='items'] ::slotted([focus-ring]:not([disabled])) {
      box-shadow: inset 0 0 0 2px var(--lumo-primary-color-50pct);
    }

    @media (pointer: coarse) {
      [part='items'] ::slotted(vaadin-item:hover:not([disabled])) {
        background-color: transparent;
      }

      [part='items'] ::slotted([focus-ring]:not([disabled])) {
        box-shadow: none;
      }
    }

    /* Dividers */
    [part='items'] ::slotted(hr) {
      height: 1px;
      border: 0;
      padding: 0;
      margin: var(--lumo-space-s) var(--lumo-border-radius);
      background-color: var(--lumo-contrast-10pct);
    }

    /* RTL specific styles */
    :host([dir='rtl']) [part='items'] ::slotted(vaadin-item) {
      padding-left: calc(var(--lumo-space-l) + var(--lumo-border-radius) / 4);
      padding-right: var(--_lumo-list-box-item-padding-left, calc(var(--lumo-border-radius) / 4));
    }
  `,{moduleId:"lumo-list-box"});let iq=class{static getFlattenedNodes(e){let t=tH(e);return iU(e)?t.assignedNodes({flatten:!0}):Array.from(t.childNodes).map(e=>iU(e)?tH(e).assignedNodes({flatten:!0}):[e]).reduce((e,t)=>e.concat(t),[])}constructor(e,t){this._shadyChildrenObserver=null,this._nativeChildrenObserver=null,this._connected=!1,this._target=e,this.callback=t,this._effectiveNodes=[],this._observer=null,this._scheduled=!1,this._boundSchedule=()=>{this._schedule()},this.connect(),this._schedule()}connect(){iU(this._target)?this._listenSlots([this._target]):tH(this._target).children&&(this._listenSlots(tH(this._target).children),window.ShadyDOM?this._shadyChildrenObserver=window.ShadyDOM.observeChildren(this._target,e=>{this._processMutations(e)}):(this._nativeChildrenObserver=new MutationObserver(e=>{this._processMutations(e)}),this._nativeChildrenObserver.observe(this._target,{childList:!0}))),this._connected=!0}disconnect(){iU(this._target)?this._unlistenSlots([this._target]):tH(this._target).children&&(this._unlistenSlots(tH(this._target).children),window.ShadyDOM&&this._shadyChildrenObserver?(window.ShadyDOM.unobserveChildren(this._shadyChildrenObserver),this._shadyChildrenObserver=null):this._nativeChildrenObserver&&(this._nativeChildrenObserver.disconnect(),this._nativeChildrenObserver=null)),this._connected=!1}_schedule(){this._scheduled||(this._scheduled=!0,rr.run(()=>this.flush()))}_processMutations(e){this._processSlotMutations(e),this.flush()}_processSlotMutations(e){if(e)for(let t=0;t<e.length;t++){let r=e[t];r.addedNodes&&this._listenSlots(r.addedNodes),r.removedNodes&&this._unlistenSlots(r.removedNodes)}}flush(){if(!this._connected)return!1;window.ShadyDOM&&ShadyDOM.flush(),this._nativeChildrenObserver?this._processSlotMutations(this._nativeChildrenObserver.takeRecords()):this._shadyChildrenObserver&&this._processSlotMutations(this._shadyChildrenObserver.takeRecords()),this._scheduled=!1;let e={target:this._target,addedNodes:[],removedNodes:[]},t=this.constructor.getFlattenedNodes(this._target),r=ij(t,this._effectiveNodes);for(let t=0,i;t<r.length&&(i=r[t]);t++)for(let t=0,r;t<i.removed.length&&(r=i.removed[t]);t++)e.removedNodes.push(r);for(let i=0,n;i<r.length&&(n=r[i]);i++)for(let r=n.index;r<n.index+n.addedCount;r++)e.addedNodes.push(t[r]);this._effectiveNodes=t;let i=!1;return(e.addedNodes.length||e.removedNodes.length)&&(i=!0,this.callback.call(this._target,e)),i}_listenSlots(e){for(let t=0;t<e.length;t++){let r=e[t];iU(r)&&r.addEventListener("slotchange",this._boundSchedule)}}_unlistenSlots(e){for(let t=0;t<e.length;t++){let r=e[t];iU(r)&&r.removeEventListener("slotchange",this._boundSchedule)}}};/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/class iV{constructor(){this._asyncModule=null,this._callback=null,this._timer=null}setConfig(e,t){this._asyncModule=e,this._callback=t,this._timer=this._asyncModule.run(()=>{this._timer=null,iW.delete(this),this._callback()})}cancel(){this.isActive()&&(this._cancelAsync(),iW.delete(this))}_cancelAsync(){this.isActive()&&(this._asyncModule.cancel(this._timer),this._timer=null)}flush(){this.isActive()&&(this.cancel(),this._callback())}isActive(){return null!=this._timer}static debounce(e,t,r){return e instanceof iV?e._cancelAsync():e=new iV,e.setConfig(t,r),e}}let iW=new Set,iY=function(e){iW.add(e)},iG=function(){let e=!!iW.size;return iW.forEach(e=>{try{e.flush()}catch(e){setTimeout(()=>{throw e})}}),e},iJ=e=>class extends e{static get properties(){return{_hasVaadinListMixin:{value:!0},selected:{type:Number,reflectToAttribute:!0,notify:!0},orientation:{type:String,reflectToAttribute:!0,value:""},items:{type:Array,readOnly:!0,notify:!0},_searchBuf:{type:String,value:""}}}static get observers(){return["_enhanceItems(items, orientation, selected, disabled)"]}ready(){super.ready(),this.addEventListener("keydown",e=>this._onKeydown(e)),this.addEventListener("click",e=>this._onClick(e)),this._observer=new iq(this,e=>{this._setItems(this._filterItems(Array.from(this.children)))})}_enhanceItems(e,t,r,i){if(!i&&e){this.setAttribute("aria-orientation",t||"vertical"),this.items.forEach(e=>{t?e.setAttribute("orientation",t):e.removeAttribute("orientation"),e.updateStyles()}),this._setFocusable(r);let i=e[r];e.forEach(e=>e.selected=e===i),i&&!i.disabled&&this._scrollToItem(r)}}get focused(){return this.getRootNode().activeElement}_filterItems(e){return e.filter(e=>e._hasVaadinItemMixin)}_onClick(e){let t;if(e.metaKey||e.shiftKey||e.ctrlKey||e.defaultPrevented)return;let r=this._filterItems(e.composedPath())[0];r&&!r.disabled&&(t=this.items.indexOf(r))>=0&&(this.selected=t)}_searchKey(e,t){this._searchReset=iV.debounce(this._searchReset,re.after(500),()=>this._searchBuf=""),this._searchBuf+=t.toLowerCase();let r=e=>!(e.disabled||this._isItemHidden(e))&&0===e.textContent.replace(/[^a-zA-Z0-9]/g,"").toLowerCase().indexOf(this._searchBuf);this.items.some(e=>0===e.textContent.replace(/[^a-zA-Z0-9]/g,"").toLowerCase().indexOf(this._searchBuf))||(this._searchBuf=t.toLowerCase());let i=1===this._searchBuf.length?e+1:e;return this._getAvailableIndex(i,1,r)}get _isRTL(){return!this._vertical&&"rtl"===this.getAttribute("dir")}_onKeydown(e){let t,r;if(e.metaKey||e.ctrlKey)return;let i=e.key.replace(/^Arrow/,""),n=this.items.indexOf(this.focused);if(/[a-zA-Z0-9]/.test(i)&&1===i.length){let e=this._searchKey(n,i);e>=0&&this._focus(e);return}let s=e=>!(e.disabled||this._isItemHidden(e)),o=this._isRTL?-1:1;this._vertical&&"Up"===i||!this._vertical&&"Left"===i?(r=-o,t=n-o):this._vertical&&"Down"===i||!this._vertical&&"Right"===i?(r=o,t=n+o):"Home"===i?(r=1,t=0):"End"===i&&(r=-1,t=this.items.length-1),(t=this._getAvailableIndex(t,r,s))>=0&&(this._focus(t),e.preventDefault())}_getAvailableIndex(e,t,r){let i=this.items.length;for(let n=0;"number"==typeof e&&n<i;n++,e+=t||1){e<0?e=i-1:e>=i&&(e=0);let t=this.items[e];if(r(t))return e}return -1}_isItemHidden(e){return"none"===getComputedStyle(e).display}_setFocusable(e){e=this._getAvailableIndex(e,1,e=>!e.disabled);let t=this.items[e]||this.items[0];this.items.forEach(e=>e.tabIndex=e===t?0:-1)}_focus(e){let t=this.items[e];this.items.forEach(e=>e.focused=e===t),this._setFocusable(e),this._scrollToItem(e),t.focus()}focus(){this._observer&&this._observer.flush();let e=this.querySelector('[tabindex="0"]')||(this.items?this.items[0]:null);e&&e.focus()}get _scrollerElement(){}_scrollToItem(e){let t=this.items[e];if(!t)return;let r=this._vertical?["top","bottom"]:this._isRTL?["right","left"]:["left","right"],i=this._scrollerElement.getBoundingClientRect(),n=(this.items[e+1]||t).getBoundingClientRect(),s=(this.items[e-1]||t).getBoundingClientRect(),o=0;!this._isRTL&&n[r[1]]>=i[r[1]]||this._isRTL&&n[r[1]]<=i[r[1]]?o=n[r[1]]-i[r[1]]:(!this._isRTL&&s[r[0]]<=i[r[0]]||this._isRTL&&s[r[0]]>=i[r[0]])&&(o=s[r[0]]-i[r[0]]),this._scroll(o)}get _vertical(){return"horizontal"!==this.orientation}_scroll(e){if(this._vertical)this._scrollerElement.scrollTop+=e;else{let t=iP.detectScrollType(),r=iP.getNormalizedScrollLeft(t,this.getAttribute("dir")||"ltr",this._scrollerElement)+e;iP.setNormalizedScrollLeft(t,this.getAttribute("dir")||"ltr",this._scrollerElement,r)}}},i$=e=>class extends iJ(e){static get properties(){return{multiple:{type:Boolean,value:!1,reflectToAttribute:!0,observer:"_multipleChanged"},selectedValues:{type:Array,notify:!0,value:function(){return[]}}}}static get observers(){return["_enhanceMultipleItems(items, multiple, selected, selectedValues, selectedValues.*)"]}ready(){this.addEventListener("click",e=>this._onMultipleClick(e)),super.ready()}_enhanceMultipleItems(e,t,r,i){if(e&&t){if(i){let t=i.map(t=>e[t]);e.forEach(e=>e.selected=-1!==t.indexOf(e))}this._scrollToLastSelectedItem()}}_scrollToLastSelectedItem(){let e=this.selectedValues.slice(-1)[0];e&&!e.disabled&&this._scrollToItem(e)}_onMultipleClick(e){let t=this._filterItems(e.composedPath())[0],r=t&&!t.disabled?this.items.indexOf(t):-1;!(r<0)&&this.multiple&&(e.preventDefault(),-1!==this.selectedValues.indexOf(r)?this.selectedValues=this.selectedValues.filter(e=>e!==r):this.selectedValues=this.selectedValues.concat(r))}_multipleChanged(e,t){!e&&t&&(this.selectedValues=[],this.items.forEach(e=>e.selected=!1)),e&&!t&&void 0!==this.selected&&(this.push("selectedValues",this.selected),this.selected=void 0)}},iX=function(){let e,t;do e=window.ShadyDOM&&ShadyDOM.flush(),window.ShadyCSS&&window.ShadyCSS.ScopingShim&&window.ShadyCSS.ScopingShim.flush(),t=iG();while(e||t)},iZ=/\/\*\*\s+vaadin-dev-mode:start([\s\S]*)vaadin-dev-mode:end\s+\*\*\//i,iK=window.Vaadin&&window.Vaadin.Flow&&window.Vaadin.Flow.clients;function iQ(){return i5(function(){return!0})}function i0(){try{if(i1())return!0;if(!i2())return!1;if(iK)return!i4();return!iQ()}catch(e){return!1}}function i1(){return localStorage.getItem("vaadin.developmentmode.force")}function i2(){return["localhost","127.0.0.1"].indexOf(window.location.hostname)>=0}function i4(){if(iK){let e=Object.keys(iK).map(e=>iK[e]).filter(e=>e.productionMode);if(e.length>0)return!0}return!1}function i5(e,t){if("function"!=typeof e)return;let r=iZ.exec(e.toString());if(r)try{e=Function(r[1])}catch(e){console.log("vaadin-development-mode-detector: uncommentAndRun() failed",e)}return e(t)}window.Vaadin=window.Vaadin||{};let i3=function(e,t){if(window.Vaadin.developmentMode)return i5(e,t)};function i6(){}void 0===window.Vaadin.developmentMode&&(window.Vaadin.developmentMode=i0());let i7=function(){if("function"==typeof i3)return i3(i6)};window.Vaadin||(window.Vaadin={}),window.Vaadin.registrations=window.Vaadin.registrations||[],window.Vaadin.developmentModeCallback=window.Vaadin.developmentModeCallback||{},window.Vaadin.developmentModeCallback["vaadin-usage-statistics"]=function(){i7&&i7()};let i9=new Set,i8=e=>class extends iN(e){static finalize(){super.finalize();let{is:e}=this;e&&!i9.has(e)&&(window.Vaadin.registrations.push(this),i9.add(e),window.Vaadin.developmentModeCallback&&iY(o=iV.debounce(o,rt,()=>{window.Vaadin.developmentModeCallback["vaadin-usage-statistics"]()})))}constructor(){super(),null===document.doctype&&console.warn('Vaadin components require the "standards mode" declaration. Please add <!DOCTYPE html> to the HTML document.')}};/**
 * @license
 * Copyright (c) 2020 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */class ne extends i8(i$(iA(iS))){static get template(){return iw`
      <style>
        :host {
          display: flex;
        }

        :host([hidden]) {
          display: none !important;
        }

        [part='items'] {
          height: 100%;
          width: 100%;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
      </style>
      <div part="items">
        <slot></slot>
      </div>
    `}static get is(){return"vaadin-list-box"}static get version(){return"2.0.0"}static get properties(){return{orientation:{readOnly:!0}}}constructor(){super(),this.focused}ready(){super.ready(),this.setAttribute("role","list"),setTimeout(this._checkImport.bind(this),2e3)}get _scrollerElement(){return this.shadowRoot.querySelector('[part="items"]')}_checkImport(){var e=this.querySelector("vaadin-item");!e||e instanceof iS||console.warn("Make sure you have imported the vaadin-item element.")}}customElements.define(ne.is,ne);/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let nt="string"==typeof document.head.style.touchAction,nr="__polymerGestures",ni="__polymerGesturesHandled",nn="__polymerGesturesTouchAction",ns=25,no=5,na=2,nl=2500,nd=["mousedown","mousemove","mouseup","click"],nc=[0,1,4,2],nu=function(){try{return 1===new MouseEvent("test",{buttons:1}).buttons}catch(e){return!1}}();function nh(e){return nd.indexOf(e)>-1}let np=!1;function nm(e){return nh(e)||"touchend"===e?void 0:nt&&np&&T?{passive:!0}:void 0}!function(){try{let e=Object.defineProperty({},"passive",{get(){np=!0}});window.addEventListener("test",null,e),window.removeEventListener("test",null,e)}catch(e){}}();let nf=navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/),n_=[],ny={button:!0,input:!0,keygen:!0,meter:!0,output:!0,textarea:!0,progress:!0,select:!0},ng={button:!0,command:!0,fieldset:!0,input:!0,keygen:!0,optgroup:!0,option:!0,select:!0,textarea:!0};function nv(e){return ny[e.localName]||!1}function nb(e){let t=Array.prototype.slice.call(e.labels||[]);if(!t.length){t=[];let r=e.getRootNode();if(e.id){let i=r.querySelectorAll(`label[for = ${e.id}]`);for(let e=0;e<i.length;e++)t.push(i[e])}}return t}let nw=function(e){let t=e.sourceCapabilities;if((!t||t.firesTouchEvents)&&(e[ni]={skip:!0},"click"===e.type)){let t=!1,r=nM(e);for(let e=0;e<r.length;e++){if(r[e].nodeType===Node.ELEMENT_NODE){if("label"===r[e].localName)n_.push(r[e]);else if(nv(r[e])){let i=nb(r[e]);for(let e=0;e<i.length;e++)t=t||n_.indexOf(i[e])>-1}}if(r[e]===nx.mouse.target)return}if(t)return;e.preventDefault(),e.stopPropagation()}};function nS(e){let t=nf?["click"]:nd;for(let r=0,i;r<t.length;r++)i=t[r],e?(n_.length=0,document.addEventListener(i,nw,!0)):document.removeEventListener(i,nw,!0)}function nC(e){D&&(nx.mouse.mouseIgnoreJob||nS(!0),nx.mouse.target=nM(e)[0],nx.mouse.mouseIgnoreJob=iV.debounce(nx.mouse.mouseIgnoreJob,re.after(nl),function(){nS(),nx.mouse.target=null,nx.mouse.mouseIgnoreJob=null}))}function nA(e){let t=e.type;if(!nh(t))return!1;if("mousemove"!==t)return 0===(void 0===e.button?0:e.button);{let t=void 0===e.buttons?1:e.buttons;return e instanceof window.MouseEvent&&!nu&&(t=nc[e.which]||0),!!(1&t)}}function nP(e){if("click"===e.type){if(0===e.detail)return!0;let t=nL(e);if(!t.nodeType||t.nodeType!==Node.ELEMENT_NODE)return!0;let r=t.getBoundingClientRect(),i=e.pageX,n=e.pageY;return!(i>=r.left&&i<=r.right&&n>=r.top&&n<=r.bottom)}return!1}let nx={mouse:{target:null,mouseIgnoreJob:null},touch:{x:0,y:0,id:-1,scrollDecided:!1}};function nE(e){let t="auto",r=nM(e);for(let e=0,i;e<r.length;e++)if((i=r[e])[nn]){t=i[nn];break}return t}function nO(e,t,r){e.movefn=t,e.upfn=r,document.addEventListener("mousemove",t),document.addEventListener("mouseup",r)}function nT(e){document.removeEventListener("mousemove",e.movefn),document.removeEventListener("mouseup",e.upfn),e.movefn=null,e.upfn=null}D&&document.addEventListener("touchend",nC,!!np&&{passive:!0});let nM=window.ShadyDOM&&window.ShadyDOM.noPatch?window.ShadyDOM.composedPath:e=>e.composedPath&&e.composedPath()||[],nN={},nk=[];function nI(e,t){let r=document.elementFromPoint(e,t),i=r;for(;i&&i.shadowRoot&&!window.ShadyDOM&&i!==(i=i.shadowRoot.elementFromPoint(e,t));)i&&(r=i);return r}function nL(e){let t=nM(e);return t.length>0?t[0]:e.target}function nR(e){let t;let r=e.type,i=e.currentTarget[nr];if(!i)return;let n=i[r];if(n){if(!e[ni]&&(e[ni]={},"touch"===r.slice(0,5))){let t=e.changedTouches[0];if("touchstart"===r&&1===e.touches.length&&(nx.touch.id=t.identifier),nx.touch.id!==t.identifier)return;nt||"touchstart"!==r&&"touchmove"!==r||nF(e)}if(!(t=e[ni]).skip){for(let r=0,i;r<nk.length;r++)n[(i=nk[r]).name]&&!t[i.name]&&i.flow&&i.flow.start.indexOf(e.type)>-1&&i.reset&&i.reset();for(let i=0,s;i<nk.length;i++)n[(s=nk[i]).name]&&!t[s.name]&&(t[s.name]=!0,s[r](e))}}}function nF(e){let t=e.changedTouches[0],r=e.type;if("touchstart"===r)nx.touch.x=t.clientX,nx.touch.y=t.clientY,nx.touch.scrollDecided=!1;else if("touchmove"===r){if(nx.touch.scrollDecided)return;nx.touch.scrollDecided=!0;let r=nE(e),i=!1,n=Math.abs(nx.touch.x-t.clientX),s=Math.abs(nx.touch.y-t.clientY);e.cancelable&&("none"===r?i=!0:"pan-x"===r?i=s>n:"pan-y"===r&&(i=n>s)),i?e.preventDefault():nW("track")}}function nD(e,t,r){return!!nN[t]&&(nB(e,t,r),!0)}function nz(e,t,r){return!!nN[t]&&(nj(e,t,r),!0)}function nB(e,t,r){let i=nN[t],n=i.deps,s=i.name,o=e[nr];o||(e[nr]=o={});for(let t=0,r,i;t<n.length;t++)r=n[t],nf&&nh(r)&&"click"!==r||((i=o[r])||(o[r]=i={_count:0}),0===i._count&&e.addEventListener(r,nR,nm(r)),i[s]=(i[s]||0)+1,i._count=(i._count||0)+1);e.addEventListener(t,r),i.touchAction&&nq(e,i.touchAction)}function nj(e,t,r){let i=nN[t],n=i.deps,s=i.name,o=e[nr];if(o)for(let t=0,r,i;t<n.length;t++)(i=o[r=n[t]])&&i[s]&&(i[s]=(i[s]||1)-1,i._count=(i._count||1)-1,0===i._count&&e.removeEventListener(r,nR,nm(r)));e.removeEventListener(t,r)}function nH(e){nk.push(e);for(let t=0;t<e.emits.length;t++)nN[e.emits[t]]=e}function nU(e){for(let t=0,r;t<nk.length;t++){r=nk[t];for(let t=0;t<r.emits.length;t++)if(r.emits[t]===e)return r}return null}function nq(e,t){nt&&e instanceof HTMLElement&&rr.run(()=>{e.style.touchAction=t}),e[nn]=t}function nV(e,t,r){let i=new Event(t,{bubbles:!0,cancelable:!0,composed:!0});if(i.detail=r,tH(e).dispatchEvent(i),i.defaultPrevented){let e=r.preventer||r.sourceEvent;e&&e.preventDefault&&e.preventDefault()}}function nW(e){let t=nU(e);t.info&&(t.info.prevent=!0)}function nY(e,t,r,i){t&&nV(t,e,{x:r.clientX,y:r.clientY,sourceEvent:r,preventer:i,prevent:function(e){return nW(e)}})}function nG(e,t,r){if(e.prevent)return!1;if(e.started)return!0;let i=Math.abs(e.x-t),n=Math.abs(e.y-r);return i>=no||n>=no}function nJ(e,t,r){if(!t)return;let i=e.moves[e.moves.length-2],n=e.moves[e.moves.length-1],s=n.x-e.x,o=n.y-e.y,a,l=0;i&&(a=n.x-i.x,l=n.y-i.y),nV(t,"track",{state:e.state,x:r.clientX,y:r.clientY,dx:s,dy:o,ddx:a,ddy:l,sourceEvent:r,hover:function(){return nI(r.clientX,r.clientY)}})}function n$(e,t,r){let i=Math.abs(t.clientX-e.x),n=Math.abs(t.clientY-e.y),s=nL(r||t);!(!s||ng[s.localName]&&s.hasAttribute("disabled"))&&(isNaN(i)||isNaN(n)||i<=ns&&n<=ns||nP(t))&&!e.prevent&&nV(s,"tap",{x:t.clientX,y:t.clientY,sourceEvent:t,preventer:r})}nH({name:"downup",deps:["mousedown","touchstart","touchend"],flow:{start:["mousedown","touchstart"],end:["mouseup","touchend"]},emits:["down","up"],info:{movefn:null,upfn:null},reset:function(){nT(this.info)},mousedown:function(e){if(!nA(e))return;let t=nL(e),r=this;nO(this.info,function(e){nA(e)||(nY("up",t,e),nT(r.info))},function(e){nA(e)&&nY("up",t,e),nT(r.info)}),nY("down",t,e)},touchstart:function(e){nY("down",nL(e),e.changedTouches[0],e)},touchend:function(e){nY("up",nL(e),e.changedTouches[0],e)}}),nH({name:"track",touchAction:"none",deps:["mousedown","touchstart","touchmove","touchend"],flow:{start:["mousedown","touchstart"],end:["mouseup","touchend"]},emits:["track"],info:{x:0,y:0,state:"start",started:!1,moves:[],addMove:function(e){this.moves.length>na&&this.moves.shift(),this.moves.push(e)},movefn:null,upfn:null,prevent:!1},reset:function(){this.info.state="start",this.info.started=!1,this.info.moves=[],this.info.x=0,this.info.y=0,this.info.prevent=!1,nT(this.info)},mousedown:function(e){if(!nA(e))return;let t=nL(e),r=this,i=function(e){let i=e.clientX,n=e.clientY;nG(r.info,i,n)&&(r.info.state=r.info.started?"mouseup"===e.type?"end":"track":"start","start"===r.info.state&&nW("tap"),r.info.addMove({x:i,y:n}),nA(e)||(r.info.state="end",nT(r.info)),t&&nJ(r.info,t,e),r.info.started=!0)};nO(this.info,i,function(e){r.info.started&&i(e),nT(r.info)}),this.info.x=e.clientX,this.info.y=e.clientY},touchstart:function(e){let t=e.changedTouches[0];this.info.x=t.clientX,this.info.y=t.clientY},touchmove:function(e){let t=nL(e),r=e.changedTouches[0],i=r.clientX,n=r.clientY;nG(this.info,i,n)&&("start"===this.info.state&&nW("tap"),this.info.addMove({x:i,y:n}),nJ(this.info,t,r),this.info.state="track",this.info.started=!0)},touchend:function(e){let t=nL(e),r=e.changedTouches[0];this.info.started&&(this.info.state="end",this.info.addMove({x:r.clientX,y:r.clientY}),nJ(this.info,t,r))}}),nH({name:"tap",deps:["mousedown","click","touchstart","touchend"],flow:{start:["mousedown","touchstart"],end:["click","touchend"]},emits:["tap"],info:{x:NaN,y:NaN,prevent:!1},reset:function(){this.info.x=NaN,this.info.y=NaN,this.info.prevent=!1},mousedown:function(e){nA(e)&&(this.info.x=e.clientX,this.info.y=e.clientY)},click:function(e){nA(e)&&n$(this.info,e)},touchstart:function(e){let t=e.changedTouches[0];this.info.x=t.clientX,this.info.y=t.clientY},touchend:function(e){n$(this.info,e.changedTouches[0],e)}});/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let nX=tj(e=>{class t extends e{_addEventListenerToNode(e,t,r){nD(e,t,r)||super._addEventListenerToNode(e,t,r)}_removeEventListenerFromNode(e,t,r){nz(e,t,r)||super._removeEventListenerFromNode(e,t,r)}}return t});/**
 * @license
 * Copyright (c) 2020 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */class nZ extends iI{static get is(){return"vaadin-context-menu-item"}}customElements.define(nZ.is,nZ);class nK extends ne{static get is(){return"vaadin-context-menu-list-box"}}customElements.define(nK.is,nK);let nQ=e=>class extends e{static get properties(){return{items:Array}}ready(){super.ready(),this.__itemsOutsideClickListener=e=>{e.composedPath().filter(e=>"vaadin-context-menu-overlay"===e.localName)[0]||this.dispatchEvent(new CustomEvent("items-outside-click"))},this.addEventListener("items-outside-click",()=>this.items&&this.close())}connectedCallback(){super.connectedCallback(),document.documentElement.addEventListener("click",this.__itemsOutsideClickListener)}disconnectedCallback(){super.disconnectedCallback(),document.documentElement.removeEventListener("click",this.__itemsOutsideClickListener)}get __isRTL(){return"rtl"===this.getAttribute("dir")}__forwardFocus(){let e=this.$.overlay,t=e.getFirstChild();if(e.parentOverlay){let r=e.parentOverlay.querySelector("[expanded]");r&&r.hasAttribute("focused")&&t?t.focus():e.$.overlay.focus()}else t&&t.focus()}__openSubMenu(e,t){let r;e.items=t._item.children,e.listenOn=t;let i=t.getBoundingClientRect(),n=e.$.overlay.$.content,s=getComputedStyle(n),o=this.$.overlay,a=o.hasAttribute("bottom-aligned")?i.bottom+parseFloat(s.paddingBottom):i.top-parseFloat(s.paddingTop);e.$.overlay._setParentOverlay(o),o.theme?e.setAttribute("theme",o.theme):e.removeAttribute("theme"),n.style.minWidth="",document.documentElement.clientWidth-i.right>i.width?r=i.right:(r=i.left-i.width,n.style.minWidth=o.$.content.clientWidth+"px"),r=Math.max(r,0),t.dispatchEvent(new CustomEvent("opensubmenu",{detail:{x:r,y:a,children:t._item.children}}))}__itemsRenderer(e,t,r){this.__initMenu(e,t);let i=e.querySelector(this.constructor.is);i.closeOn=t.closeOn;let n=e.querySelector("vaadin-context-menu-list-box");n.innerHTML="";let s=Array.from(r.detail.children||t.items);s.forEach(e=>{let t;(t=e.component instanceof HTMLElement?e.component:document.createElement(e.component||"vaadin-context-menu-item"))instanceof iI?(t.setAttribute("role","menuitem"),t.classList.add("vaadin-menu-item")):"hr"===t.localName&&t.setAttribute("role","separator"),this.theme&&t.setAttribute("theme",this.theme),t._item=e,e.text&&(t.textContent=e.text),this.__toggleMenuComponentAttribute(t,"menu-item-checked",e.checked),this.__toggleMenuComponentAttribute(t,"disabled",e.disabled),t.setAttribute("aria-haspopup","false"),t.classList.remove("vaadin-context-menu-parent-item"),e.children&&e.children.length&&(t.classList.add("vaadin-context-menu-parent-item"),t.setAttribute("aria-haspopup","true"),t.setAttribute("aria-expanded","false"),t.removeAttribute("expanded")),n.appendChild(t)})}__toggleMenuComponentAttribute(e,t,r){r?(e.setAttribute(t,""),e["__has-"+t]=!0):e["__has-"+t]&&(e.removeAttribute(t),e["__has-"+t]=!1)}__initMenu(e,t){if(e.firstElementChild){let t=e.querySelector("vaadin-context-menu-list-box");this.theme?t.setAttribute("theme",this.theme):t.removeAttribute("theme")}else{let r=this.constructor.is;e.innerHTML=`
        <vaadin-context-menu-list-box></vaadin-context-menu-list-box>
        <${r} hidden></${r}>
      `,iX();let i=e.querySelector("vaadin-context-menu-list-box");this.theme&&i.setAttribute("theme",this.theme),i.classList.add("vaadin-menu-list-box"),requestAnimationFrame(()=>i.setAttribute("role","menu"));let n=e.querySelector(r);n.$.overlay.modeless=!0,n.openOn="opensubmenu",t.addEventListener("opened-changed",e=>!e.detail.value&&n.close()),n.addEventListener("opened-changed",e=>{if(!e.detail.value){let e=i.querySelector("[expanded]");e&&(e.setAttribute("aria-expanded","false"),e.removeAttribute("expanded"))}}),i.addEventListener("selected-changed",e=>{if("number"==typeof e.detail.value){let r=e.target.items[e.detail.value]._item;r.children||t.dispatchEvent(new CustomEvent("item-selected",{detail:{value:r}})),i.selected=null}}),n.addEventListener("item-selected",e=>{t.dispatchEvent(new CustomEvent("item-selected",{detail:e.detail}))}),n.addEventListener("close-all-menus",()=>{t.dispatchEvent(new CustomEvent("close-all-menus"))}),t.addEventListener("close-all-menus",t.close),t.addEventListener("item-selected",t.close),t.$.overlay.$.backdrop.addEventListener("click",()=>t.close()),t.$.overlay.addEventListener("keydown",e=>{let r=this.__isRTL;!r&&37===e.keyCode||r&&39===e.keyCode?(t.close(),t.listenOn.focus()):27===e.keyCode&&t.dispatchEvent(new CustomEvent("close-all-menus"))}),requestAnimationFrame(()=>this.__openListenerActive=!0);let s=(e,r=e.composedPath().filter(e=>"vaadin-context-menu-item"===e.localName)[0])=>{if(this.__openListenerActive){if(t.$.overlay.hasAttribute("opening")){requestAnimationFrame(()=>s(e,r));return}if(r){if(n.items!==r._item.children&&n.close(),!t.opened)return;r._item.children&&r._item.children.length?(r.setAttribute("aria-expanded","true"),r.setAttribute("expanded",""),this.__openSubMenu(n,r)):n.listenOn.focus()}}};t.$.overlay.addEventListener("mouseover",s),t.$.overlay.addEventListener("keydown",e=>{let t=this.__isRTL,r=!t&&39===e.keyCode||t&&37===e.keyCode||13===e.keyCode||32===e.keyCode;r&&s(e)})}}};/**
 * @license
 * Copyright (c) 2020 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */nH({name:"vaadin-contextmenu",deps:["touchstart","touchmove","touchend","contextmenu"],flow:{start:["touchstart","contextmenu"],end:["contextmenu"]},emits:["vaadin-contextmenu"],info:{sourceEvent:null,_ios:/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream||"MacIntel"===navigator.platform&&navigator.maxTouchPoints>1},reset:function(){this.info.sourceEvent=null,this._cancelTimer(),this.info.touchJob=null,this.info.touchStartCoords=null},_cancelTimer:function(){this._timerId&&(clearTimeout(this._timerId),delete this._fired)},touchstart:function(e){this.info.sourceEvent=e,this.info.touchStartCoords={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};let t=e.composedPath()[0]||e.target;this._timerId=setTimeout(()=>{let r=e.changedTouches[0];e.shiftKey||(this.info._ios&&(this._fired=!0,this.fire(t,r.clientX,r.clientY)),nW("tap"))},500)},touchmove:function(e){let t=this.info.touchStartCoords;(Math.abs(t.x-e.changedTouches[0].clientX)>15||Math.abs(t.y-e.changedTouches[0].clientY)>15)&&this._cancelTimer()},touchend:function(e){this._fired&&e.preventDefault(),this._cancelTimer()},contextmenu:function(e){e.shiftKey||(this.info.sourceEvent=e,this.fire(e.target,e.clientX,e.clientY),nW("tap"))},fire:function(e,t,r){let i=this.info.sourceEvent,n=new Event("vaadin-contextmenu",{bubbles:!0,cancelable:!0,composed:!0});n.detail={x:t,y:r,sourceEvent:i},e.dispatchEvent(n),n.defaultPrevented&&i&&i.preventDefault&&i.preventDefault()}});/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/class n0{constructor(){this.start=0,this.end=0,this.previous=null,this.parent=null,this.rules=null,this.parsedCssText="",this.cssText="",this.atRule=!1,this.type=0,this.keyframesName="",this.selector="",this.parsedSelector=""}}function n1(e){return n5(n4(e=n2(e)),e)}function n2(e){return e.replace(sn.comments,"").replace(sn.port,"")}function n4(e){let t=new n0;t.start=0,t.end=e.length;let r=t;for(let i=0,n=e.length;i<n;i++)if(e[i]===sr){r.rules||(r.rules=[]);let e=r,t=e.rules[e.rules.length-1]||null;(r=new n0).start=i+1,r.parent=e,r.previous=t,e.rules.push(r)}else e[i]===si&&(r.end=i+1,r=r.parent||t);return t}function n5(e,t){let r=t.substring(e.start,e.end-1);if(e.parsedCssText=e.cssText=r.trim(),e.parent){let i=e.previous?e.previous.end:e.parent.start;r=(r=(r=n3(r=t.substring(i,e.start-1))).replace(sn.multipleSpaces," ")).substring(r.lastIndexOf(";")+1);let n=e.parsedSelector=e.selector=r.trim();e.atRule=0===n.indexOf(sa),e.atRule?0===n.indexOf(so)?e.type=st.MEDIA_RULE:n.match(sn.keyframesRule)&&(e.type=st.KEYFRAMES_RULE,e.keyframesName=e.selector.split(sn.multipleSpaces).pop()):0===n.indexOf(ss)?e.type=st.MIXIN_RULE:e.type=st.STYLE_RULE}let i=e.rules;if(i)for(let e=0,r=i.length,n;e<r&&(n=i[e]);e++)n5(n,t);return e}function n3(e){return e.replace(/\\([0-9a-f]{1,6})\s/gi,function(){let e=arguments[1],t=6-e.length;for(;t--;)e="0"+e;return"\\"+e})}function n6(e,t,r=""){let i="";if(e.cssText||e.rules){let r=e.rules;if(r&&!n7(r))for(let e=0,n=r.length,s;e<n&&(s=r[e]);e++)i=n6(s,t,i);else(i=(i=t?e.cssText:n9(e.cssText)).trim())&&(i="  "+i+"\n")}return i&&(e.selector&&(r+=e.selector+" "+sr+"\n"),r+=i,e.selector&&(r+=si+"\n\n")),r}function n7(e){let t=e[0];return!!t&&!!t.selector&&0===t.selector.indexOf(ss)}function n9(e){return se(e=n8(e))}function n8(e){return e.replace(sn.customProp,"").replace(sn.mixinProp,"")}function se(e){return e.replace(sn.mixinApply,"").replace(sn.varApply,"")}let st={STYLE_RULE:1,KEYFRAMES_RULE:7,MEDIA_RULE:4,MIXIN_RULE:1e3},sr="{",si="}",sn={comments:/\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,port:/@import[^;]*;/gim,customProp:/(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,mixinProp:/(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,mixinApply:/@apply\s*\(?[^);]*\)?\s*(?:[;\n]|$)?/gim,varApply:/[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,keyframesRule:/^@[^\s]*keyframes/,multipleSpaces:/\s+/g},ss="--",so="@media",sa="@",sl=new Set;function sd(e){let t=e.textContent;if(!sl.has(t)){sl.add(t);let e=document.createElement("style");e.setAttribute("shady-unscoped",""),e.textContent=t,document.head.appendChild(e)}}function sc(e){return e.hasAttribute("shady-unscoped")}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/function su(e,t){return e?("string"==typeof e&&(e=n1(e)),t&&sp(e,t),n6(e,tp)):""}function sh(e){return!e.__cssRules&&e.textContent&&(e.__cssRules=n1(e.textContent)),e.__cssRules||null}function sp(e,t,r,i){if(!e)return;let n=!1,s=e.type;if(i&&s===st.MEDIA_RULE){let t=e.selector.match(to);t&&!window.matchMedia(t[1]).matches&&(n=!0)}s===st.STYLE_RULE?t(e):r&&s===st.KEYFRAMES_RULE?r(e):s===st.MIXIN_RULE&&(n=!0);let o=e.rules;if(o&&!n)for(let e=0,n=o.length,s;e<n&&(s=o[e]);e++)sp(s,t,r,i)}function sm(e,t){let r=0;for(let i=t,n=e.length;i<n;i++)if("("===e[i])r++;else if(")"===e[i]&&0==--r)return i;return -1}function sf(e,t){let r=e.indexOf("var(");if(-1===r)return t(e,"","","");let i=sm(e,r+3),n=e.substring(r+4,i),s=e.substring(0,r),o=sf(e.substring(i+1),t),a=n.indexOf(",");return -1===a?t(s,n.trim(),"",o):t(s,n.substring(0,a).trim(),n.substring(a+1).trim(),o)}function s_(e){let t=e.localName,r="",i="";return t?t.indexOf("-")>-1?r=t:(i=t,r=e.getAttribute&&e.getAttribute("is")||""):(r=e.is,i=e.extends),{is:r,typeExtension:i}}function sy(e){let t=[],r=e.querySelectorAll("style");for(let e=0;e<r.length;e++){let i=r[e];sc(i)?tc||(sd(i),i.parentNode.removeChild(i)):(t.push(i.textContent),i.parentNode.removeChild(i))}return t.join("").trim()}window.ShadyDOM&&window.ShadyDOM.wrap||(e=>e);let sg="css-build";function sv(e){if(void 0!==n)return n;if(void 0===e.__cssBuild){let t=e.getAttribute(sg);if(t)e.__cssBuild=t;else{let t=sw(e);""!==t&&sS(e),e.__cssBuild=t}}return e.__cssBuild||""}function sb(e){return""!==sv(e)}function sw(e){let t="template"===e.localName?e.content.firstChild:e.firstChild;if(t instanceof Comment){let e=t.textContent.trim().split(":");if(e[0]===sg)return e[1]}return""}function sS(e){let t="template"===e.localName?e.content.firstChild:e.firstChild;t.parentNode.removeChild(t)}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let sC=/;\s*/m,sA=/^\s*(initial)|(inherit)\s*$/,sP=/\s*!important/;class sx{constructor(){this._map={}}set(e,t){e=e.trim(),this._map[e]={properties:t,dependants:{}}}get(e){return e=e.trim(),this._map[e]||null}}let sE=null;class sO{constructor(){this._currentElement=null,this._measureElement=null,this._map=new sx}detectMixin(e){return td(e)}gatherStyles(e){let t=sy(e.content);if(t){let r=document.createElement("style");return r.textContent=t,e.content.insertBefore(r,e.content.firstChild),r}return null}transformTemplate(e,t){void 0===e._gatheredStyle&&(e._gatheredStyle=this.gatherStyles(e));let r=e._gatheredStyle;return r?this.transformStyle(r,t):null}transformStyle(e,t=""){let r=sh(e);return this.transformRules(r,t),e.textContent=su(r),r}transformCustomStyle(e){let t=sh(e);return sp(t,e=>{":root"===e.selector&&(e.selector="html"),this.transformRule(e)}),e.textContent=su(t),t}transformRules(e,t){this._currentElement=t,sp(e,e=>{this.transformRule(e)}),this._currentElement=null}transformRule(e){e.cssText=this.transformCssText(e.parsedCssText,e),":root"===e.selector&&(e.selector=":host > *")}transformCssText(e,t){return e=e.replace(tn,(e,r,i,n)=>this._produceCssProperties(e,r,i,n,t)),this._consumeCssProperties(e,t)}_getInitialValueForProperty(e){return this._measureElement||(this._measureElement=document.createElement("meta"),this._measureElement.setAttribute("apply-shim-measure",""),this._measureElement.style.all="initial",document.head.appendChild(this._measureElement)),window.getComputedStyle(this._measureElement).getPropertyValue(e)}_fallbacksFromPreviousRules(e){let t=e;for(;t.parent;)t=t.parent;let r={},i=!1;return sp(t,t=>{(i=i||t===e)||t.selector!==e.selector||Object.assign(r,this._cssTextToMap(t.parsedCssText))}),r}_consumeCssProperties(e,t){let r=null;for(;r=ts.exec(e);){let i=r[0],n=r[1],s=r.index,o=s+i.indexOf("@apply"),a=s+i.length,l=e.slice(0,o),d=e.slice(a),c=t?this._fallbacksFromPreviousRules(t):{};Object.assign(c,this._cssTextToMap(l));let u=this._atApplyToCssProperties(n,c);e=`${l}${u}${d}`,ts.lastIndex=s+u.length}return e}_atApplyToCssProperties(e,t){e=e.replace(sC,"");let r=[],i=this._map.get(e);if(i||(this._map.set(e,{}),i=this._map.get(e)),i){let n,s,o;this._currentElement&&(i.dependants[this._currentElement]=!0);let a=i.properties;for(n in a)o=t&&t[n],s=[n,": var(",e,"_-_",n],o&&s.push(",",o.replace(sP,"")),s.push(")"),sP.test(a[n])&&s.push(" !important"),r.push(s.join(""))}return r.join("; ")}_replaceInitialOrInherit(e,t){let r=sA.exec(t);return r&&(t=r[1]?this._getInitialValueForProperty(e):"apply-shim-inherit"),t}_cssTextToMap(e,t=!1){let r,i,n=e.split(";"),s={};for(let e=0,o,a;e<n.length;e++)(o=n[e])&&(a=o.split(":")).length>1&&(r=a[0].trim(),i=a.slice(1).join(":"),t&&(i=this._replaceInitialOrInherit(r,i)),s[r]=i);return s}_invalidateMixinEntry(e){if(sE)for(let t in e.dependants)t!==this._currentElement&&sE(t)}_produceCssProperties(e,t,r,i,n){let s,o;if(r&&sf(r,(e,t)=>{t&&this._map.get(t)&&(i=`@apply ${t};`)}),!i)return e;let a=this._consumeCssProperties(""+i,n),l=e.slice(0,e.indexOf("--")),d=this._cssTextToMap(a,!0),c=d,u=this._map.get(t),h=u&&u.properties;h?c=Object.assign(Object.create(h),d):this._map.set(t,c);let p=[],m=!1;for(s in c)void 0===(o=d[s])&&(o="initial"),!h||s in h||(m=!0),p.push(`${t}_-_${s}: ${o}`);return m&&this._invalidateMixinEntry(u),u&&(u.properties=c),r&&(l=`${e};${l}`),`${l}${p.join("; ")};`}}sO.prototype.detectMixin=sO.prototype.detectMixin,sO.prototype.transformStyle=sO.prototype.transformStyle,sO.prototype.transformCustomStyle=sO.prototype.transformCustomStyle,sO.prototype.transformRules=sO.prototype.transformRules,sO.prototype.transformRule=sO.prototype.transformRule,sO.prototype.transformTemplate=sO.prototype.transformTemplate,sO.prototype._separator="_-_",Object.defineProperty(sO.prototype,"invalidCallback",{get:()=>sE,set(e){sE=e}});let sT={},sM=sT,sN="_applyShimCurrentVersion",sk="_applyShimNextVersion",sI="_applyShimValidatingVersion",sL=Promise.resolve();function sR(e){let t=sM[e];t&&sF(t)}function sF(e){e[sN]=e[sN]||0,e[sI]=e[sI]||0,e[sk]=(e[sk]||0)+1}function sD(e){return e[sN]===e[sk]}function sz(e){return!sD(e)&&e[sI]===e[sk]}function sB(e){e[sI]=e[sk],e._validating||(e._validating=!0,sL.then(function(){e[sN]=e[sk],e._validating=!1}))}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let sj=new sO;class sH{constructor(){this.customStyleInterface=null,sj.invalidCallback=sR}ensure(){!this.customStyleInterface&&window.ShadyCSS.CustomStyleInterface&&(this.customStyleInterface=window.ShadyCSS.CustomStyleInterface,this.customStyleInterface.transformCallback=e=>{sj.transformCustomStyle(e)},this.customStyleInterface.validateCallback=()=>{requestAnimationFrame(()=>{this.customStyleInterface.enqueued&&this.flushCustomStyles()})})}prepareTemplate(e,t){if(this.ensure(),sb(e))return;sM[t]=e;let r=sj.transformTemplate(e,t);e._styleAst=r}flushCustomStyles(){if(this.ensure(),!this.customStyleInterface)return;let e=this.customStyleInterface.processStyles();if(this.customStyleInterface.enqueued){for(let t=0;t<e.length;t++){let r=e[t],i=this.customStyleInterface.getStyleForCustomStyle(r);i&&sj.transformCustomStyle(i)}this.customStyleInterface.enqueued=!1}}styleSubtree(e,t){if(this.ensure(),t&&ta(e,t),e.shadowRoot){this.styleElement(e);let t=e.shadowRoot.children||e.shadowRoot.childNodes;for(let e=0;e<t.length;e++)this.styleSubtree(t[e])}else{let t=e.children||e.childNodes;for(let e=0;e<t.length;e++)this.styleSubtree(t[e])}}styleElement(e){this.ensure();let{is:t}=s_(e),r=sM[t];if(!(r&&sb(r))&&r&&!sD(r)){sz(r)||(this.prepareTemplate(r,t),sB(r));let i=e.shadowRoot;if(i){let e=i.querySelector("style");e&&(e.__cssRules=r._styleAst,e.textContent=su(r._styleAst))}}}styleDocument(e){this.ensure(),this.styleSubtree(document.body,e)}}if(!window.ShadyCSS||!window.ShadyCSS.ScopingShim){let e=new sH,t=window.ShadyCSS&&window.ShadyCSS.CustomStyleInterface;window.ShadyCSS={prepareTemplate(t,r,i){e.flushCustomStyles(),e.prepareTemplate(t,r)},prepareTemplateStyles(e,t,r){window.ShadyCSS.prepareTemplate(e,t,r)},prepareTemplateDom(e,t){},styleSubtree(t,r){e.flushCustomStyles(),e.styleSubtree(t,r)},styleElement(t){e.flushCustomStyles(),e.styleElement(t)},styleDocument(t){e.flushCustomStyles(),e.styleDocument(t)},getComputedStyleValue:(e,t)=>tl(e,t),flushCustomStyles(){e.flushCustomStyles()},nativeCss:tp,nativeShadow:tc,cssBuild:n,disableRuntime:th},t&&(window.ShadyCSS.CustomStyleInterface=t)}window.ShadyCSS.ApplyShim=sj;/**
 * @fileoverview
 * @suppress {checkPrototypalTypes}
 * @license Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */let sU=/:host\(:dir\((ltr|rtl)\)\)/g,sq=/([\s\w-#\.\[\]\*]*):dir\((ltr|rtl)\)/g,sV=/:dir\((?:ltr|rtl)\)/,sW=!!(window.ShadyDOM&&window.ShadyDOM.inUse),sY=[],sG=null,sJ="";function s$(){sJ=document.documentElement.getAttribute("dir")}function sX(e){e.__autoDirOptOut||e.setAttribute("dir",sJ)}function sZ(){s$(),sJ=document.documentElement.getAttribute("dir");for(let e=0;e<sY.length;e++)sX(sY[e])}function sK(){sG&&sG.takeRecords().length&&sZ()}let sQ=tj(e=>{sW||sG||(s$(),(sG=new MutationObserver(sZ)).observe(document.documentElement,{attributes:!0,attributeFilter:["dir"]}));let t=ra(e);class r extends t{static _processStyleText(e,r){return e=t._processStyleText.call(this,e,r),!sW&&sV.test(e)&&(e=this._replaceDirInCssText(e),this.__activateDir=!0),e}static _replaceDirInCssText(e){let t=e;return(t=t.replace(sU,':host([dir="$1"])')).replace(sq,':host([dir="$2"]) $1')}constructor(){super(),this.__autoDirOptOut=!1}ready(){super.ready(),this.__autoDirOptOut=this.hasAttribute("dir")}connectedCallback(){t.prototype.connectedCallback&&super.connectedCallback(),this.constructor.__activateDir&&(sK(),sY.push(this),sX(this))}disconnectedCallback(){if(t.prototype.disconnectedCallback&&super.disconnectedCallback(),this.constructor.__activateDir){let e=sY.indexOf(this);e>-1&&sY.splice(e,1)}}}return r.__activateDir=!1,r}),s0=!1,s1=[],s2=[];function s4(){s0=!0,requestAnimationFrame(function(){s0=!1,s5(s1),setTimeout(function(){s3(s2)})})}function s5(e){for(;e.length;)s6(e.shift())}function s3(e){for(let t=0,r=e.length;t<r;t++)s6(e.shift())}function s6(e){let t=e[0],r=e[1],i=e[2];try{r.apply(t,i)}catch(e){setTimeout(()=>{throw e})}}function s7(e,t,r){s0||s4(),s2.push([e,t,r])}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/function s9(){document.body.removeAttribute("unresolved")}"interactive"===document.readyState||"complete"===document.readyState?s9():window.addEventListener("DOMContentLoaded",s9);/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let s8=Element.prototype,oe=s8.matches||s8.matchesSelector||s8.mozMatchesSelector||s8.msMatchesSelector||s8.oMatchesSelector||s8.webkitMatchesSelector,ot=function(e,t){return oe.call(e,t)};class or{constructor(e){window.ShadyDOM&&window.ShadyDOM.inUse&&window.ShadyDOM.patch(e),this.node=e}observeNodes(e){return new iq(this.node,e)}unobserveNodes(e){e.disconnect()}notifyObserver(){}deepContains(e){if(tH(this.node).contains(e))return!0;let t=e,r=e.ownerDocument;for(;t&&t!==r&&t!==this.node;)t=tH(t).parentNode||tH(t).host;return t===this.node}getOwnerRoot(){return tH(this.node).getRootNode()}getDistributedNodes(){return"slot"===this.node.localName?tH(this.node).assignedNodes({flatten:!0}):[]}getDestinationInsertionPoints(){let e=[],t=tH(this.node).assignedSlot;for(;t;)e.push(t),t=tH(t).assignedSlot;return e}importNode(e,t){return tH(this.node instanceof Document?this.node:this.node.ownerDocument).importNode(e,t)}getEffectiveChildNodes(){return iq.getFlattenedNodes(this.node)}queryDistributedElements(e){let t=this.getEffectiveChildNodes(),r=[];for(let i=0,n=t.length,s;i<n&&(s=t[i]);i++)s.nodeType===Node.ELEMENT_NODE&&ot(s,e)&&r.push(s);return r}get activeElement(){let e=this.node;return void 0!==e._activeElement?e._activeElement:e.activeElement}}function oi(e,t){for(let r=0;r<t.length;r++){let i=t[r];e[i]=function(){return this.node[i].apply(this.node,arguments)}}}function on(e,t){for(let r=0;r<t.length;r++){let i=t[r];Object.defineProperty(e,i,{get:function(){return this.node[i]},configurable:!0})}}function os(e,t){for(let r=0;r<t.length;r++){let i=t[r];Object.defineProperty(e,i,{get:function(){return this.node[i]},set:function(e){this.node[i]=e},configurable:!0})}}class oo{constructor(e){this.event=e}get rootTarget(){return this.path[0]}get localTarget(){return this.event.target}get path(){return this.event.composedPath()}}or.prototype.cloneNode,or.prototype.appendChild,or.prototype.insertBefore,or.prototype.removeChild,or.prototype.replaceChild,or.prototype.setAttribute,or.prototype.removeAttribute,or.prototype.querySelector,or.prototype.querySelectorAll,or.prototype.parentNode,or.prototype.firstChild,or.prototype.lastChild,or.prototype.nextSibling,or.prototype.previousSibling,or.prototype.firstElementChild,or.prototype.lastElementChild,or.prototype.nextElementSibling,or.prototype.previousElementSibling,or.prototype.childNodes,or.prototype.children,or.prototype.classList,or.prototype.textContent,or.prototype.innerHTML;let oa=or;if(window.ShadyDOM&&window.ShadyDOM.inUse&&window.ShadyDOM.noPatch&&window.ShadyDOM.Wrapper){class e extends window.ShadyDOM.Wrapper{}Object.getOwnPropertyNames(or.prototype).forEach(t=>{"activeElement"!=t&&(e.prototype[t]=or.prototype[t])}),on(e.prototype,["classList"]),oa=e,Object.defineProperties(oo.prototype,{localTarget:{get(){let e=this.event.currentTarget,t=e&&ol(e).getOwnerRoot(),r=this.path;for(let e=0;e<r.length;e++){let i=r[e];if(ol(i).getOwnerRoot()===t)return i}},configurable:!0},path:{get(){return window.ShadyDOM.composedPath(this.event)},configurable:!0}})}else oi(or.prototype,["cloneNode","appendChild","insertBefore","removeChild","replaceChild","setAttribute","removeAttribute","querySelector","querySelectorAll"]),on(or.prototype,["parentNode","firstChild","lastChild","nextSibling","previousSibling","firstElementChild","lastElementChild","nextElementSibling","previousElementSibling","childNodes","children","classList"]),os(or.prototype,["textContent","innerHTML","className"]);let ol=function(e){if((e=e||document)instanceof oa||e instanceof oo)return e;let t=e.__domApi;return t||(t=e instanceof Event?new oo(e):new oa(e),e.__domApi=t),t},od=window.ShadyDOM,oc=window.ShadyCSS;function ou(e,t){return tH(e).getRootNode()===t}function oh(e,t=!1){if(!od||!oc||!od.handlesDynamicScoping)return null;let r=oc.ScopingShim;if(!r)return null;let i=r.scopeForNode(e),n=tH(e).getRootNode(),s=e=>{if(!ou(e,n))return;let t=Array.from(od.nativeMethods.querySelectorAll.call(e,"*"));t.push(e);for(let e=0;e<t.length;e++){let s=t[e];if(!ou(s,n))continue;let o=r.currentScopeForNode(s);o!==i&&(""!==o&&r.unscopeNode(s,o),r.scopeNode(s,i))}};if(s(e),!t)return null;{let t=new MutationObserver(e=>{for(let t=0;t<e.length;t++){let r=e[t];for(let e=0;e<r.addedNodes.length;e++){let t=r.addedNodes[e];t.nodeType===Node.ELEMENT_NODE&&s(t)}}});return t.observe(e,{childList:!0,subtree:!0}),t}}/**
 * @fileoverview
 * @suppress {checkPrototypalTypes}
 * @license Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */let op="disable-upgrade",om=e=>{for(;e;){let t=Object.getOwnPropertyDescriptor(e,"observedAttributes");if(t)return t.get;e=Object.getPrototypeOf(e.prototype).constructor}return()=>[]};tj(e=>{let t=iy(e),r=om(t);class i extends t{constructor(){super(),this.__isUpgradeDisabled}static get observedAttributes(){return r.call(this).concat(op)}_initializeProperties(){this.hasAttribute(op)?this.__isUpgradeDisabled=!0:super._initializeProperties()}_enableProperties(){this.__isUpgradeDisabled||super._enableProperties()}_canApplyPropertyDefault(e){return super._canApplyPropertyDefault(e)&&!(this.__isUpgradeDisabled&&this._isPropertyPending(e))}attributeChangedCallback(e,t,r,i){e==op?this.__isUpgradeDisabled&&null==r&&(super._initializeProperties(),this.__isUpgradeDisabled=!1,tH(this).isConnected&&super.connectedCallback()):super.attributeChangedCallback(e,t,r,i)}connectedCallback(){this.__isUpgradeDisabled||super.connectedCallback()}disconnectedCallback(){this.__isUpgradeDisabled||super.disconnectedCallback()}}return i});/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let of="disable-upgrade",o_=window.ShadyCSS,oy=tj(e=>{let t=nX(iy(e)),r=i_?t:sQ(t),i=om(r),n={x:"pan-x",y:"pan-y",none:"none",all:"auto"};class s extends r{constructor(){super(),this.isAttached,this.__boundListeners,this._debouncers,this.__isUpgradeDisabled,this.__needsAttributesAtConnected,this._legacyForceObservedAttributes}static get importMeta(){return this.prototype.importMeta}created(){}__attributeReaction(e,t,r){(this.__dataAttributes&&this.__dataAttributes[e]||e===of)&&this.attributeChangedCallback(e,t,r,null)}setAttribute(e,t){if(H&&!this._legacyForceObservedAttributes){let r=this.getAttribute(e);super.setAttribute(e,t),this.__attributeReaction(e,r,String(t))}else super.setAttribute(e,t)}removeAttribute(e){if(H&&!this._legacyForceObservedAttributes){let t=this.getAttribute(e);super.removeAttribute(e),this.__attributeReaction(e,t,null)}else super.removeAttribute(e)}static get observedAttributes(){return H&&!this.prototype._legacyForceObservedAttributes?(this.hasOwnProperty(JSCompiler_renameProperty("__observedAttributes",this))||(this.__observedAttributes=[],ih(this.prototype)),this.__observedAttributes):i.call(this).concat(of)}_enableProperties(){this.__isUpgradeDisabled||super._enableProperties()}_canApplyPropertyDefault(e){return super._canApplyPropertyDefault(e)&&!(this.__isUpgradeDisabled&&this._isPropertyPending(e))}connectedCallback(){this.__needsAttributesAtConnected&&this._takeAttributes(),this.__isUpgradeDisabled||(super.connectedCallback(),this.isAttached=!0,this.attached())}attached(){}disconnectedCallback(){this.__isUpgradeDisabled||(super.disconnectedCallback(),this.isAttached=!1,this.detached())}detached(){}attributeChangedCallback(e,t,r,i){t!==r&&(e==of?this.__isUpgradeDisabled&&null==r&&(this._initializeProperties(),this.__isUpgradeDisabled=!1,tH(this).isConnected&&this.connectedCallback()):(super.attributeChangedCallback(e,t,r,i),this.attributeChanged(e,t,r)))}attributeChanged(e,t,r){}_initializeProperties(){if(k&&this.hasAttribute(of))this.__isUpgradeDisabled=!0;else{let e=Object.getPrototypeOf(this);e.hasOwnProperty(JSCompiler_renameProperty("__hasRegisterFinished",e))||(this._registered(),e.__hasRegisterFinished=!0),super._initializeProperties(),this.root=this,this.created(),!H||this._legacyForceObservedAttributes||(this.hasAttributes()?this._takeAttributes():this.parentNode||(this.__needsAttributesAtConnected=!0)),this._applyListeners()}}_takeAttributes(){let e=this.attributes;for(let t=0,r=e.length;t<r;t++){let r=e[t];this.__attributeReaction(r.name,null,r.value)}}_registered(){}ready(){this._ensureAttributes(),super.ready()}_ensureAttributes(){}_applyListeners(){}serialize(e){return this._serializeValue(e)}deserialize(e,t){return this._deserializeValue(e,t)}reflectPropertyToAttribute(e,t,r){this._propertyToAttribute(e,t,r)}serializeValueToAttribute(e,t,r){this._valueToNodeAttribute(r||this,e,t)}extend(e,t){if(!(e&&t))return e||t;let r=Object.getOwnPropertyNames(t);for(let i=0,n;i<r.length&&(n=r[i]);i++){let r=Object.getOwnPropertyDescriptor(t,n);r&&Object.defineProperty(e,n,r)}return e}mixin(e,t){for(let r in t)e[r]=t[r];return e}chainObject(e,t){return e&&t&&e!==t&&(e.__proto__=t),e}instanceTemplate(e){let t=this.constructor._contentForTemplate(e);return document.importNode(t,!0)}fire(e,t,r){r=r||{},t=null==t?{}:t;let i=new Event(e,{bubbles:void 0===r.bubbles||r.bubbles,cancelable:!!r.cancelable,composed:void 0===r.composed||r.composed});return i.detail=t,tH(r.node||this).dispatchEvent(i),i}listen(e,t,r){e=e||this;let i=this.__boundListeners||(this.__boundListeners=new WeakMap),n=i.get(e);n||(n={},i.set(e,n));let s=t+r;n[s]||(n[s]=this._addMethodEventListenerToNode(e,t,r,this))}unlisten(e,t,r){e=e||this;let i=this.__boundListeners&&this.__boundListeners.get(e),n=t+r,s=i&&i[n];s&&(this._removeEventListenerFromNode(e,t,s),i[n]=null)}setScrollDirection(e,t){nq(t||this,n[e]||"auto")}$$(e){return this.root.querySelector(e)}get domHost(){let e=tH(this).getRootNode();return e instanceof DocumentFragment?e.host:e}distributeContent(){let e=ol(this);window.ShadyDOM&&e.shadowRoot&&ShadyDOM.flush()}getEffectiveChildNodes(){let e=ol(this);return e.getEffectiveChildNodes()}queryDistributedElements(e){let t=ol(this);return t.queryDistributedElements(e)}getEffectiveChildren(){return this.getEffectiveChildNodes().filter(function(e){return e.nodeType===Node.ELEMENT_NODE})}getEffectiveTextContent(){let e=this.getEffectiveChildNodes(),t=[];for(let r=0,i;i=e[r];r++)i.nodeType!==Node.COMMENT_NODE&&t.push(i.textContent);return t.join("")}queryEffectiveChildren(e){let t=this.queryDistributedElements(e);return t&&t[0]}queryAllEffectiveChildren(e){return this.queryDistributedElements(e)}getContentChildNodes(e){let t=this.root.querySelector(e||"slot");return t?ol(t).getDistributedNodes():[]}getContentChildren(e){return this.getContentChildNodes(e).filter(function(e){return e.nodeType===Node.ELEMENT_NODE})}isLightDescendant(e){return this!==e&&tH(this).contains(e)&&tH(this).getRootNode()===tH(e).getRootNode()}isLocalDescendant(e){return this.root===tH(e).getRootNode()}scopeSubtree(e,t=!1){return oh(e,t)}getComputedStyleValue(e){return o_.getComputedStyleValue(this,e)}debounce(e,t,r){return this._debouncers=this._debouncers||{},this._debouncers[e]=iV.debounce(this._debouncers[e],r>0?re.after(r):rr,t.bind(this))}isDebouncerActive(e){this._debouncers=this._debouncers||{};let t=this._debouncers[e];return!!(t&&t.isActive())}flushDebouncer(e){this._debouncers=this._debouncers||{};let t=this._debouncers[e];t&&t.flush()}cancelDebouncer(e){this._debouncers=this._debouncers||{};let t=this._debouncers[e];t&&t.cancel()}async(e,t){return t>0?re.run(e.bind(this),t):~rr.run(e.bind(this))}cancelAsync(e){e<0?rr.cancel(~e):re.cancel(e)}create(e,t){let r=document.createElement(e);if(t){if(r.setProperties)r.setProperties(t);else for(let e in t)r[e]=t[e]}return r}elementMatches(e,t){return ot(t||this,e)}toggleAttribute(e,t){let r=this;return(3==arguments.length&&(r=arguments[2]),1==arguments.length&&(t=!r.hasAttribute(e)),t)?(tH(r).setAttribute(e,""),!0):(tH(r).removeAttribute(e),!1)}toggleClass(e,t,r){r=r||this,1==arguments.length&&(t=!r.classList.contains(e)),t?r.classList.add(e):r.classList.remove(e)}transform(e,t){(t=t||this).style.webkitTransform=e,t.style.transform=e}translate3d(e,t,r,i){i=i||this,this.transform("translate3d("+e+","+t+","+r+")",i)}arrayDelete(e,t){let r;if(Array.isArray(e)){if((r=e.indexOf(t))>=0)return e.splice(r,1)}else if((r=tX(this,e).indexOf(t))>=0)return this.splice(e,r,1);return null}_logger(e,t){switch(Array.isArray(t)&&1===t.length&&Array.isArray(t[0])&&(t=t[0]),e){case"log":case"warn":case"error":console[e](...t)}}_log(...e){this._logger("log",e)}_warn(...e){this._logger("warn",e)}_error(...e){this._logger("error",e)}_logf(e,...t){return["[%s::%s]",this.is,e,...t]}}return s.prototype.is="",s}),og={attached:!0,detached:!0,ready:!0,created:!0,beforeRegister:!0,registered:!0,attributeChanged:!0,listeners:!0,hostAttributes:!0},ov={attached:!0,detached:!0,ready:!0,created:!0,beforeRegister:!0,registered:!0,attributeChanged:!0,behaviors:!0,_noAccessors:!0},ob=Object.assign({listeners:!0,hostAttributes:!0,properties:!0,observers:!0},ov);function ow(e,t,r){let i=e._noAccessors,n=Object.getOwnPropertyNames(e);for(let s=0;s<n.length;s++){let o=n[s];if(!(o in r)){if(i)t[o]=e[o];else{let r=Object.getOwnPropertyDescriptor(e,o);r&&(r.configurable=!0,Object.defineProperty(t,o,r))}}}}function oS(e,t,r){for(let i=0;i<t.length;i++)oC(e,t[i],r,ob)}function oC(e,t,r,i){for(let n in ow(t,e,i),og)t[n]&&(r[n]=r[n]||[],r[n].push(t[n]))}function oA(e,t,r){t=t||[];for(let i=e.length-1;i>=0;i--){let n=e[i];n?Array.isArray(n)?oA(n,t):0>t.indexOf(n)&&(!r||0>r.indexOf(n))&&t.unshift(n):console.warn("behavior is null, check for missing or 404 import")}return t}function oP(e,t){for(let r in t){let i=e[r],n=t[r];!("value"in n)&&i&&"value"in i?e[r]=Object.assign({value:i.value},n):e[r]=n}}let ox=oy(HTMLElement);function oE(e,t,r){let i;let n={};class s extends t{static _finalizeClass(){if(this.hasOwnProperty(JSCompiler_renameProperty("generatedFrom",this))){if(i)for(let e=0,t;e<i.length;e++)(t=i[e]).properties&&this.createProperties(t.properties),t.observers&&this.createObservers(t.observers,t.properties);e.properties&&this.createProperties(e.properties),e.observers&&this.createObservers(e.observers,e.properties),this._prepareTemplate()}else t._finalizeClass.call(this)}static get properties(){let t={};if(i)for(let e=0;e<i.length;e++)oP(t,i[e].properties);return oP(t,e.properties),t}static get observers(){let t=[];if(i)for(let e=0,r;e<i.length;e++)(r=i[e]).observers&&(t=t.concat(r.observers));return e.observers&&(t=t.concat(e.observers)),t}created(){super.created();let e=n.created;if(e)for(let t=0;t<e.length;t++)e[t].call(this)}_registered(){let e=s.prototype;if(!e.hasOwnProperty(JSCompiler_renameProperty("__hasRegisterFinished",e))){e.__hasRegisterFinished=!0,super._registered(),k&&o(e);let t=Object.getPrototypeOf(this),r=n.beforeRegister;if(r)for(let e=0;e<r.length;e++)r[e].call(t);if(r=n.registered)for(let e=0;e<r.length;e++)r[e].call(t)}}_applyListeners(){super._applyListeners();let e=n.listeners;if(e)for(let t=0;t<e.length;t++){let r=e[t];if(r)for(let e in r)this._addMethodEventListenerToNode(this,e,r[e])}}_ensureAttributes(){let e=n.hostAttributes;if(e)for(let t=e.length-1;t>=0;t--){let r=e[t];for(let e in r)this._ensureAttribute(e,r[e])}super._ensureAttributes()}ready(){super.ready();let e=n.ready;if(e)for(let t=0;t<e.length;t++)e[t].call(this)}attached(){super.attached();let e=n.attached;if(e)for(let t=0;t<e.length;t++)e[t].call(this)}detached(){super.detached();let e=n.detached;if(e)for(let t=0;t<e.length;t++)e[t].call(this)}attributeChanged(e,t,r){super.attributeChanged();let i=n.attributeChanged;if(i)for(let n=0;n<i.length;n++)i[n].call(this,e,t,r)}}if(r){Array.isArray(r)||(r=[r]);let e=t.prototype.behaviors;i=oA(r,null,e),s.prototype.behaviors=e?e.concat(r):i}let o=t=>{i&&oS(t,i,n),oC(t,e,n,ov)};return k||o(s.prototype),s.generatedFrom=e,s}let oO=function(e,t){e||console.warn("Polymer.Class requires `info` argument");let r=t?t(ox):ox;return(r=oE(e,r,e.behaviors)).is=r.prototype.is=e.is,r},oT=function(e){let t;return t="function"==typeof e?e:oT.Class(e),e._legacyForceObservedAttributes&&(t.prototype._legacyForceObservedAttributes=e._legacyForceObservedAttributes),customElements.define(t.is,t),t};/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/function oM(e,t,r,i,n){let s;n&&(s="object"==typeof r&&null!==r)&&(i=e.__dataTemp[t]);let o=i!==r&&(i==i||r==r);return s&&o&&(e.__dataTemp[t]=r),o}oT.Class=oO;let oN=tj(e=>{class t extends e{_shouldPropertyChange(e,t,r){return oM(this,e,t,r,!0)}}return t}),ok=tj(e=>{class t extends e{static get properties(){return{mutableData:Boolean}}_shouldPropertyChange(e,t,r){return oM(this,e,t,r,this.mutableData)}}return t});oN._mutablePropertyChange=oM;/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let oI=null;function oL(){return oI}oL.prototype=Object.create(HTMLTemplateElement.prototype,{constructor:{value:oL,writable:!0}});let oR=ia(oL),oF=oN(oR);function oD(e,t){oI=e,Object.setPrototypeOf(e,t.prototype),new t,oI=null}let oz=ia(class{});function oB(e,t){for(let r=0;r<t.length;r++){let i=t[r];if(!!e!=!!i.__hideTemplateChildren__){if(i.nodeType===Node.TEXT_NODE)e?(i.__polymerTextContent__=i.textContent,i.textContent=""):i.textContent=i.__polymerTextContent__;else if("slot"===i.localName){if(e)i.__polymerReplaced__=document.createComment("hidden-slot"),tH(tH(i).parentNode).replaceChild(i.__polymerReplaced__,i);else{let e=i.__polymerReplaced__;e&&tH(tH(e).parentNode).replaceChild(i,e)}}else i.style&&(e?(i.__polymerDisplay__=i.style.display,i.style.display="none"):i.style.display=i.__polymerDisplay__)}i.__hideTemplateChildren__=e,i._showHideChildren&&i._showHideChildren(e)}}class oj extends oz{constructor(e){super(),this._configureProperties(e),this.root=this._stampTemplate(this.__dataHost);let t=[];this.children=t;for(let e=this.root.firstChild;e;e=e.nextSibling)t.push(e),e.__templatizeInstance=this;this.__templatizeOwner&&this.__templatizeOwner.__hideTemplateChildren__&&this._showHideChildren(!0);let r=this.__templatizeOptions;(e&&r.instanceProps||!r.instanceProps)&&this._enableProperties()}_configureProperties(e){if(this.__templatizeOptions.forwardHostProp)for(let e in this.__hostProps)this._setPendingProperty(e,this.__dataHost["_host_"+e]);for(let t in e)this._setPendingProperty(t,e[t])}forwardHostProp(e,t){this._setPendingPropertyOrPath(e,t,!1,!0)&&this.__dataHost._enqueueClient(this)}_addEventListenerToNode(e,t,r){if(this._methodHost&&this.__templatizeOptions.parentModel)this._methodHost._addEventListenerToNode(e,t,e=>{e.model=this,r(e)});else{let i=this.__dataHost.__dataHost;i&&i._addEventListenerToNode(e,t,r)}}_showHideChildren(e){oB(e,this.children)}_setUnmanagedPropertyToNode(e,t,r){e.__hideTemplateChildren__&&e.nodeType==Node.TEXT_NODE&&"textContent"==t?e.__polymerTextContent__=r:super._setUnmanagedPropertyToNode(e,t,r)}get parentModel(){let e=this.__parentModel;if(!e){let t;e=this;do e=e.__dataHost.__dataHost;while((t=e.__templatizeOptions)&&!t.parentModel);this.__parentModel=e}return e}dispatchEvent(e){return!0}}oj.prototype.__dataHost,oj.prototype.__templatizeOptions,oj.prototype._methodHost,oj.prototype.__templatizeOwner,oj.prototype.__hostProps;let oH=oN(oj);function oU(e){let t=e.__dataHost;return t&&t._methodHost||t}function oq(e,t,r){let i=r.mutableData?oH:oj;o$.mixin&&(i=o$.mixin(i));let n=class extends i{};return n.prototype.__templatizeOptions=r,n.prototype._bindTemplate(e),oY(n,e,t,r),n}function oV(e,t,r,i){let n=r.forwardHostProp;if(n&&t.hasHostProps){let s="template"==e.localName,o=t.templatizeTemplateClass;if(!o){if(s){let e=r.mutableData?oF:oR;o=t.templatizeTemplateClass=class extends e{}}else{let r=e.constructor;o=t.templatizeTemplateClass=class extends r{}}let a=t.hostProps;for(let e in a)o.prototype._addPropertyEffect("_host_"+e,o.prototype.PROPERTY_EFFECT_TYPES.PROPAGATE,{fn:oW(e,n)}),o.prototype._createNotifyingProperty("_host_"+e);I&&i&&oX(t,r,i)}if(e.__dataProto&&Object.assign(e.__data,e.__dataProto),s)oD(e,o),e.__dataTemp={},e.__dataPending=null,e.__dataOld=null,e._enableProperties();else{Object.setPrototypeOf(e,o.prototype);let r=t.hostProps;for(let t in r)if((t="_host_"+t)in e){let r=e[t];delete e[t],e.__data[t]=r}}}}function oW(e,t){return function(e,r,i){t.call(e.__templatizeOwner,r.substring(6),i[r])}}function oY(e,t,r,i){let n=r.hostProps||{};for(let t in i.instanceProps){delete n[t];let r=i.notifyInstanceProp;r&&e.prototype._addPropertyEffect(t,e.prototype.PROPERTY_EFFECT_TYPES.NOTIFY,{fn:oG(t,r)})}if(i.forwardHostProp&&t.__dataHost)for(let t in n)r.hasHostProps||(r.hasHostProps=!0),e.prototype._addPropertyEffect(t,e.prototype.PROPERTY_EFFECT_TYPES.NOTIFY,{fn:oJ()})}function oG(e,t){return function(e,r,i){t.call(e.__templatizeOwner,e,r,i[r])}}function oJ(){return function(e,t,r){e.__dataHost._setPendingPropertyOrPath("_host_"+t,r[t],!0,!0)}}function o$(e,t,r){if(M&&!oU(e))throw Error("strictTemplatePolicy: template owner not trusted");if(r=r||{},e.__templatizeOwner)throw Error("A <template> can only be templatized once");e.__templatizeOwner=t;let i=t?t.constructor:oj,n=i._parseTemplate(e),s=n.templatizeInstanceClass;s||(s=oq(e,n,r),n.templatizeInstanceClass=s);let o=oU(e);oV(e,n,r,o);let a=class extends s{};return a.prototype._methodHost=o,a.prototype.__dataHost=e,a.prototype.__templatizeOwner=t,a.prototype.__hostProps=n.hostProps,a}function oX(e,t,r){let i=r.constructor._properties,{propertyEffects:n}=e,{instanceProps:s}=t;for(let e in n)if(!i[e]&&!(s&&s[e])){let t=n[e];for(let r=0;r<t.length;r++){let{part:i}=t[r].info;if(!(i.signature&&i.signature.static)){console.warn(`Property '${e}' used in template but not declared in 'properties'; attribute will not be observed.`);break}}}}function oZ(e,t){let r;for(;t;)if(r=t.__dataHost?t:t.__templatizeInstance){if(r.__dataHost==e)return r;t=r.__dataHost}else t=tH(t).parentNode;return null}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let oK=!1;function oQ(){if(k&&!P){if(!oK){oK=!0;let e=document.createElement("style");e.textContent="dom-bind,dom-if,dom-repeat{display:none;}",document.head.appendChild(e)}return!0}return!1}/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let o0=nX(ok(ia(HTMLElement)));class o1 extends o0{static get observedAttributes(){return["mutable-data"]}constructor(){if(super(),M)throw Error("strictTemplatePolicy: dom-bind not allowed");this.root=null,this.$=null,this.__children=null}attributeChangedCallback(e,t,r,i){this.mutableData=!0}connectedCallback(){oQ()||(this.style.display="none"),this.render()}disconnectedCallback(){this.__removeChildren()}__insertChildren(){tH(tH(this).parentNode).insertBefore(this.root,this)}__removeChildren(){if(this.__children)for(let e=0;e<this.__children.length;e++)this.root.appendChild(this.__children[e])}render(){let e;if(!this.__children){if(!(e=e||this.querySelector("template"))){let t=new MutationObserver(()=>{if(e=this.querySelector("template"))t.disconnect(),this.render();else throw Error("dom-bind requires a <template> child")});t.observe(this,{childList:!0});return}this.root=this._stampTemplate(e),this.$=this.root.$,this.__children=[];for(let e=this.root.firstChild;e;e=e.nextSibling)this.__children[this.__children.length]=e;this._enableProperties()}this.__insertChildren(),this.dispatchEvent(new CustomEvent("dom-change",{bubbles:!0,composed:!0}))}}customElements.define("dom-bind",o1);/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/let o2=ok(iS);class o4 extends o2{static get is(){return"dom-repeat"}static get template(){return null}static get properties(){return{items:{type:Array},as:{type:String,value:"item"},indexAs:{type:String,value:"index"},itemsIndexAs:{type:String,value:"itemsIndex"},sort:{type:Function,observer:"__sortChanged"},filter:{type:Function,observer:"__filterChanged"},observe:{type:String,observer:"__observeChanged"},delay:Number,renderedItemCount:{type:Number,notify:!j,readOnly:!0},initialCount:{type:Number},targetFramerate:{type:Number,value:20},_targetFrameTime:{type:Number,computed:"__computeFrameTime(targetFramerate)"},notifyDomChange:{type:Boolean},reuseChunkedInstances:{type:Boolean}}}static get observers(){return["__itemsChanged(items.*)"]}constructor(){super(),this.__instances=[],this.__renderDebouncer=null,this.__itemsIdxToInstIdx={},this.__chunkCount=null,this.__renderStartTime=null,this.__itemsArrayChanged=!1,this.__shouldMeasureChunk=!1,this.__shouldContinueChunking=!1,this.__chunkingId=0,this.__sortFn=null,this.__filterFn=null,this.__observePaths=null,this.__ctor=null,this.__isDetached=!0,this.template=null,this._templateInfo}disconnectedCallback(){super.disconnectedCallback(),this.__isDetached=!0;for(let e=0;e<this.__instances.length;e++)this.__detachInstance(e)}connectedCallback(){if(super.connectedCallback(),oQ()||(this.style.display="none"),this.__isDetached){this.__isDetached=!1;let e=tH(tH(this).parentNode);for(let t=0;t<this.__instances.length;t++)this.__attachInstance(t,e)}}__ensureTemplatized(){if(!this.__ctor){let e=this.template=this._templateInfo?this:this.querySelector("template");if(!e){let e=new MutationObserver(()=>{if(this.querySelector("template"))e.disconnect(),this.__render();else throw Error("dom-repeat requires a <template> child")});return e.observe(this,{childList:!0}),!1}let t={};t[this.as]=!0,t[this.indexAs]=!0,t[this.itemsIndexAs]=!0,this.__ctor=o$(e,this,{mutableData:this.mutableData,parentModel:!0,instanceProps:t,forwardHostProp:function(e,t){let r=this.__instances;for(let i=0,n;i<r.length&&(n=r[i]);i++)n.forwardHostProp(e,t)},notifyInstanceProp:function(e,t,r){if(tG(this.as,t)){let i=e[this.itemsIndexAs];t==this.as&&(this.items[i]=r);let n=tY(this.as,`${JSCompiler_renameProperty("items",this)}.${i}`,t);this.notifyPath(n,r)}}})}return!0}__getMethodHost(){return this.__dataHost._methodHost||this.__dataHost}__functionFromPropertyValue(e){if("string"==typeof e){let t=this.__getMethodHost();return function(){return t[e].apply(t,arguments)}}return e}__sortChanged(e){this.__sortFn=this.__functionFromPropertyValue(e),this.items&&this.__debounceRender(this.__render)}__filterChanged(e){this.__filterFn=this.__functionFromPropertyValue(e),this.items&&this.__debounceRender(this.__render)}__computeFrameTime(e){return Math.ceil(1e3/e)}__observeChanged(){this.__observePaths=this.observe&&this.observe.replace(".*",".").split(" ")}__handleObservedPaths(e){if(this.__sortFn||this.__filterFn){if(e){if(this.__observePaths){let t=this.__observePaths;for(let r=0;r<t.length;r++)0===e.indexOf(t[r])&&this.__debounceRender(this.__render,this.delay)}}else this.__debounceRender(this.__render,this.delay)}}__itemsChanged(e){this.items&&!Array.isArray(this.items)&&console.warn("dom-repeat expected array for `items`, found",this.items),this.__handleItemPath(e.path,e.value)||("items"===e.path&&(this.__itemsArrayChanged=!0),this.__debounceRender(this.__render))}__debounceRender(e,t=0){this.__renderDebouncer=iV.debounce(this.__renderDebouncer,t>0?re.after(t):rr,e.bind(this)),iY(this.__renderDebouncer)}render(){this.__debounceRender(this.__render),iX()}__render(){if(!this.__ensureTemplatized())return;let e=this.items||[],t=this.__sortAndFilterItems(e),r=this.__calculateLimit(t.length);this.__updateInstances(e,r,t),this.initialCount&&(this.__shouldMeasureChunk||this.__shouldContinueChunking)&&(cancelAnimationFrame(this.__chunkingId),this.__chunkingId=requestAnimationFrame(()=>this.__continueChunking())),this._setRenderedItemCount(this.__instances.length),(!j||this.notifyDomChange)&&this.dispatchEvent(new CustomEvent("dom-change",{bubbles:!0,composed:!0}))}__sortAndFilterItems(e){let t=Array(e.length);for(let r=0;r<e.length;r++)t[r]=r;return this.__filterFn&&(t=t.filter((t,r,i)=>this.__filterFn(e[t],r,i))),this.__sortFn&&t.sort((t,r)=>this.__sortFn(e[t],e[r])),t}__calculateLimit(e){let t=e,r=this.__instances.length;if(this.initialCount){let i;this.__chunkCount&&(!this.__itemsArrayChanged||this.reuseChunkedInstances)?(i=Math.min(Math.max(e-r,0),this.__chunkCount),t=Math.min(r+i,e)):(i=Math.max((t=Math.min(e,this.initialCount))-r,0),this.__chunkCount=i||1),this.__shouldMeasureChunk=i===this.__chunkCount,this.__shouldContinueChunking=t<e,this.__renderStartTime=performance.now()}return this.__itemsArrayChanged=!1,t}__continueChunking(){if(this.__shouldMeasureChunk){let e=performance.now()-this.__renderStartTime,t=this._targetFrameTime/e;this.__chunkCount=Math.round(this.__chunkCount*t)||1}this.__shouldContinueChunking&&this.__debounceRender(this.__render)}__updateInstances(e,t,r){let i;let n=this.__itemsIdxToInstIdx={};for(i=0;i<t;i++){let t=this.__instances[i],s=r[i],o=e[s];n[s]=i,t?(t._setPendingProperty(this.as,o),t._setPendingProperty(this.indexAs,i),t._setPendingProperty(this.itemsIndexAs,s),t._flushProperties()):this.__insertInstance(o,i,s)}for(let e=this.__instances.length-1;e>=i;e--)this.__detachAndRemoveInstance(e)}__detachInstance(e){let t=this.__instances[e],r=tH(t.root);for(let e=0;e<t.children.length;e++){let i=t.children[e];r.appendChild(i)}return t}__attachInstance(e,t){let r=this.__instances[e];t.insertBefore(r.root,this)}__detachAndRemoveInstance(e){this.__detachInstance(e),this.__instances.splice(e,1)}__stampInstance(e,t,r){let i={};return i[this.as]=e,i[this.indexAs]=t,i[this.itemsIndexAs]=r,new this.__ctor(i)}__insertInstance(e,t,r){let i=this.__stampInstance(e,t,r),n=this.__instances[t+1],s=n?n.children[0]:this;return tH(tH(this).parentNode).insertBefore(i.root,s),this.__instances[t]=i,i}_showHideChildren(e){for(let t=0;t<this.__instances.length;t++)this.__instances[t]._showHideChildren(e)}__handleItemPath(e,t){let r=e.slice(6),i=r.indexOf("."),n=i<0?r:r.substring(0,i);if(n==parseInt(n,10)){let e=i<0?"":r.substring(i+1);this.__handleObservedPaths(e);let s=this.__itemsIdxToInstIdx[n],o=this.__instances[s];if(o){let r=this.as+(e?"."+e:"");o._setPendingPropertyOrPath(r,t,!1,!0),o._flushProperties()}return!0}}itemForElement(e){let t=this.modelForElement(e);return t&&t[this.as]}indexForElement(e){let t=this.modelForElement(e);return t&&t[this.indexAs]}modelForElement(e){return oZ(this.template,e)}}customElements.define(o4.is,o4);/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/class o5 extends iS{static get is(){return"dom-if"}static get template(){return null}static get properties(){return{if:{type:Boolean,observer:"__debounceRender"},restamp:{type:Boolean,observer:"__debounceRender"},notifyDomChange:{type:Boolean}}}constructor(){super(),this.__renderDebouncer=null,this._lastIf=!1,this.__hideTemplateChildren__=!1,this.__template,this._templateInfo}__debounceRender(){this.__renderDebouncer=iV.debounce(this.__renderDebouncer,rr,()=>this.__render()),iY(this.__renderDebouncer)}disconnectedCallback(){super.disconnectedCallback();let e=tH(this).parentNode;e&&(e.nodeType!=Node.DOCUMENT_FRAGMENT_NODE||tH(e).host)||this.__teardownInstance()}connectedCallback(){super.connectedCallback(),oQ()||(this.style.display="none"),this.if&&this.__debounceRender()}__ensureTemplate(){if(!this.__template){let e=this._templateInfo?this:tH(this).querySelector("template");if(!e){let e=new MutationObserver(()=>{if(tH(this).querySelector("template"))e.disconnect(),this.__render();else throw Error("dom-if requires a <template> child")});return e.observe(this,{childList:!0}),!1}this.__template=e}return!0}__ensureInstance(){let e=tH(this).parentNode;if(this.__hasInstance()){let t=this.__getInstanceNodes();if(t&&t.length&&tH(this).previousSibling!==t[t.length-1])for(let r=0,i;r<t.length&&(i=t[r]);r++)tH(e).insertBefore(i,this)}else{if(!e||!this.__ensureTemplate())return!1;this.__createAndInsertInstance(e)}return!0}render(){iX()}__render(){if(this.if){if(!this.__ensureInstance())return}else this.restamp&&this.__teardownInstance();this._showHideChildren(),(!j||this.notifyDomChange)&&this.if!=this._lastIf&&(this.dispatchEvent(new CustomEvent("dom-change",{bubbles:!0,composed:!0})),this._lastIf=this.if)}__hasInstance(){}__getInstanceNodes(){}__createAndInsertInstance(e){}__teardownInstance(){}_showHideChildren(){}}class o3 extends o5{constructor(){super(),this.__instance=null,this.__syncInfo=null}__hasInstance(){return!!this.__instance}__getInstanceNodes(){return this.__instance.templateInfo.childNodes}__createAndInsertInstance(e){let t=this.__dataHost||this;if(M&&!this.__dataHost)throw Error("strictTemplatePolicy: template owner not trusted");let r=t._bindTemplate(this.__template,!0);r.runEffects=(e,t,r)=>{let i=this.__syncInfo;if(this.if)i&&(this.__syncInfo=null,this._showHideChildren(),t=Object.assign(i.changedProps,t)),e(t,r);else if(this.__instance){if(i||(i=this.__syncInfo={runEffects:e,changedProps:{}}),r)for(let e in t){let t=tq(e);i.changedProps[t]=this.__dataHost[t]}else Object.assign(i.changedProps,t)}},this.__instance=t._stampTemplate(this.__template,r),tH(e).insertBefore(this.__instance,this)}__syncHostProperties(){let e=this.__syncInfo;e&&(this.__syncInfo=null,e.runEffects(e.changedProps,!1))}__teardownInstance(){let e=this.__dataHost||this;this.__instance&&(e._removeBoundDom(this.__instance),this.__instance=null,this.__syncInfo=null)}_showHideChildren(){let e=this.__hideTemplateChildren__||!this.if;this.__instance&&!!this.__instance.__hidden!==e&&(this.__instance.__hidden=e,oB(e,this.__instance.templateInfo.childNodes)),e||this.__syncHostProperties()}}class o6 extends o5{constructor(){super(),this.__ctor=null,this.__instance=null,this.__invalidProps=null}__hasInstance(){return!!this.__instance}__getInstanceNodes(){return this.__instance.children}__createAndInsertInstance(e){this.__ctor||(this.__ctor=o$(this.__template,this,{mutableData:!0,forwardHostProp:function(e,t){this.__instance&&(this.if?this.__instance.forwardHostProp(e,t):(this.__invalidProps=this.__invalidProps||Object.create(null),this.__invalidProps[tq(e)]=!0))}})),this.__instance=new this.__ctor,tH(e).insertBefore(this.__instance.root,this)}__teardownInstance(){if(this.__instance){let e=this.__instance.children;if(e&&e.length){let t=tH(e[0]).parentNode;if(t){t=tH(t);for(let r=0,i;r<e.length&&(i=e[r]);r++)t.removeChild(i)}}this.__invalidProps=null,this.__instance=null}}__syncHostProperties(){let e=this.__invalidProps;if(e){for(let t in this.__invalidProps=null,e)this.__instance._setPendingProperty(t,this.__dataHost[t]);this.__instance._flushProperties()}}_showHideChildren(){let e=this.__hideTemplateChildren__||!this.if;this.__instance&&!!this.__instance.__hidden!==e&&(this.__instance.__hidden=e,this.__instance._showHideChildren(e)),e||this.__syncHostProperties()}}let o7=B?o3:o6;customElements.define(o7.is,o7);let o9=tj(e=>{let t=iy(e);class r extends t{static get properties(){return{items:{type:Array},multi:{type:Boolean,value:!1},selected:{type:Object,notify:!0},selectedItem:{type:Object,notify:!0},toggle:{type:Boolean,value:!1}}}static get observers(){return["__updateSelection(multi, items.*)"]}constructor(){super(),this.__lastItems=null,this.__lastMulti=null,this.__selectedMap=null}__updateSelection(e,t){let r=t.path;if(r==JSCompiler_renameProperty("items",this)){let r=t.base||[],i=this.__lastItems;if(e!==this.__lastMulti&&this.clearSelection(),i){let e=ij(r,i);this.__applySplices(e)}this.__lastItems=r,this.__lastMulti=e}else if(t.path==`${JSCompiler_renameProperty("items",this)}.splices`)this.__applySplices(t.value.indexSplices);else{let e=r.slice(`${JSCompiler_renameProperty("items",this)}.`.length),t=parseInt(e,10);0>e.indexOf(".")&&e==t&&this.__deselectChangedIdx(t)}}__applySplices(e){let t=this.__selectedMap;for(let r=0;r<e.length;r++){let i=e[r];t.forEach((e,r)=>{e<i.index||(e>=i.index+i.removed.length?t.set(r,e+i.addedCount-i.removed.length):t.set(r,-1))});for(let e=0;e<i.addedCount;e++){let r=i.index+e;t.has(this.items[r])&&t.set(this.items[r],r)}}this.__updateLinks();let r=0;t.forEach((e,i)=>{e<0?(this.multi?this.splice(JSCompiler_renameProperty("selected",this),r,1):this.selected=this.selectedItem=null,t.delete(i)):r++})}__updateLinks(){if(this.__dataLinkedPaths={},this.multi){let e=0;this.__selectedMap.forEach(t=>{t>=0&&this.linkPaths(`${JSCompiler_renameProperty("items",this)}.${t}`,`${JSCompiler_renameProperty("selected",this)}.${e++}`)})}else this.__selectedMap.forEach(e=>{this.linkPaths(JSCompiler_renameProperty("selected",this),`${JSCompiler_renameProperty("items",this)}.${e}`),this.linkPaths(JSCompiler_renameProperty("selectedItem",this),`${JSCompiler_renameProperty("items",this)}.${e}`)})}clearSelection(){this.__dataLinkedPaths={},this.__selectedMap=new Map,this.selected=this.multi?[]:null,this.selectedItem=null}isSelected(e){return this.__selectedMap.has(e)}isIndexSelected(e){return this.isSelected(this.items[e])}__deselectChangedIdx(e){let t=this.__selectedIndexForItemIndex(e);if(t>=0){let e=0;this.__selectedMap.forEach((r,i)=>{t==e++&&this.deselect(i)})}}__selectedIndexForItemIndex(e){let t=this.__dataLinkedPaths[`${JSCompiler_renameProperty("items",this)}.${e}`];if(t)return parseInt(t.slice(`${JSCompiler_renameProperty("selected",this)}.`.length),10)}deselect(e){let t=this.__selectedMap.get(e);if(t>=0){let r;this.__selectedMap.delete(e),this.multi&&(r=this.__selectedIndexForItemIndex(t)),this.__updateLinks(),this.multi?this.splice(JSCompiler_renameProperty("selected",this),r,1):this.selected=this.selectedItem=null}}deselectIndex(e){this.deselect(this.items[e])}select(e){this.selectIndex(this.items.indexOf(e))}selectIndex(e){let t=this.items[e];this.isSelected(t)?this.toggle&&this.deselectIndex(e):(this.multi||this.__selectedMap.clear(),this.__selectedMap.set(t,e),this.__updateLinks(),this.multi?this.push(JSCompiler_renameProperty("selected",this),t):this.selected=this.selectedItem=t)}}return r})(iS);class o8 extends o9{static get is(){return"array-selector"}static get template(){return null}}customElements.define(o8.is,o8),d=oN._mutablePropertyChange,oy(HTMLElement).prototype,/**
@license
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/oT({is:"iron-media-query",properties:{queryMatches:{type:Boolean,value:!1,readOnly:!0,notify:!0},query:{type:String,observer:"queryChanged"},full:{type:Boolean,value:!1},_boundMQHandler:{value:function(){return this.queryHandler.bind(this)}},_mq:{value:null}},attached:function(){this.style.display="none",this.queryChanged()},detached:function(){this._remove()},_add:function(){this._mq&&this._mq.addListener(this._boundMQHandler)},_remove:function(){this._mq&&this._mq.removeListener(this._boundMQHandler),this._mq=null},queryChanged:function(){this._remove();var e=this.query;e&&(this.full||"("===e[0]||(e="("+e+")"),this._mq=window.matchMedia(e),this._add(),this.queryHandler(this._mq))},queryHandler:function(e){this._setQueryMatches(e.matches)}});/**
 * @license
 * Copyright (c) 2020 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */class ae extends iS{static get template(){return iw`<iron-media-query query="min-device-width: 750px" query-matches="{{wide}}"></iron-media-query>`}static get is(){return"vaadin-device-detector"}static get properties(){return{phone:{type:Boolean,computed:"_phone(wide, touch)",notify:!0},touch:{type:Boolean,notify:!0,value:()=>this._touch()},wide:{type:Boolean,notify:!0}}}static _touch(){try{return document.createEvent("TouchEvent"),!0}catch(e){return!1}}_phone(e,t){return!e&&t}}customElements.define(ae.is,ae);let at=Element.prototype,ar=at.matches||at.matchesSelector||at.mozMatchesSelector||at.msMatchesSelector||at.oMatchesSelector||at.webkitMatchesSelector;class ai{static getTabbableNodes(e){let t=[],r=this._collectTabbableNodes(e,t);return r?this._sortByTabIndex(t):t}static isFocusable(e){return ar.call(e,"input, select, textarea, button, object")?ar.call(e,":not([disabled])"):ar.call(e,"a[href], area[href], iframe, [tabindex], [contentEditable]")}static isTabbable(e){return this.isFocusable(e)&&ar.call(e,':not([tabindex="-1"])')&&this._isVisible(e)}static _normalizedTabIndex(e){if(this.isFocusable(e)){let t=e.getAttribute("tabindex")||0;return Number(t)}return -1}static _collectTabbableNodes(e,t){let r;if(e.nodeType!==Node.ELEMENT_NODE||!this._isVisible(e))return!1;let i=this._normalizedTabIndex(e),n=i>0;if(i>=0&&t.push(e),r="slot"===e.localName?e.assignedNodes({flatten:!0}):(e.shadowRoot||e).children)for(let e=0;e<r.length;e++)n=this._collectTabbableNodes(r[e],t)||n;return n}static _isVisible(e){let t=e.style;return"hidden"!==t.visibility&&"none"!==t.display&&"hidden"!==(t=window.getComputedStyle(e)).visibility&&"none"!==t.display}static _sortByTabIndex(e){let t=e.length;if(t<2)return e;let r=Math.ceil(t/2),i=this._sortByTabIndex(e.slice(0,r)),n=this._sortByTabIndex(e.slice(r));return this._mergeSortByTabIndex(i,n)}static _mergeSortByTabIndex(e,t){let r=[];for(;e.length>0&&t.length>0;)this._hasLowerTabOrder(e[0],t[0])?r.push(t.shift()):r.push(e.shift());return r.concat(e,t)}static _hasLowerTabOrder(e,t){let r=Math.max(e.tabIndex,0),i=Math.max(t.tabIndex,0);return 0===r||0===i?i>r:r>i}}/**
@license
Copyright (c) 2017 Vaadin Ltd.
This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
*/let an=0,as={},ao=e=>{let t=as[e]||aa(e);return document.createElement(t)},aa=e=>{an++;let t=`vaadin-overlay-content-${an}`,r=document.createElement("template"),i=document.createElement("style");i.textContent=":host { display: block; }"+e,r.content.appendChild(i),window.ShadyCSS&&window.ShadyCSS.prepareTemplate(r,t);let n=class extends HTMLElement{static get is(){return t}constructor(){super(),this.shadowRoot||(this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(document.importNode(r.content,!0)))}connectedCallback(){window.ShadyCSS&&window.ShadyCSS.styleElement(this)}};return customElements.define(n.is,n),as[e]=t,t};class al extends iA(iN(iS)){static get template(){return iw`
    <style>
      :host {
        z-index: 200;
        position: fixed;

        /*
          Despite of what the names say, <vaadin-overlay> is just a container
          for position/sizing/alignment. The actual overlay is the overlay part.
        */

        /*
          Default position constraints: the entire viewport. Note: themes can
          override this to introduce gaps between the overlay and the viewport.
        */
        top: 0;
        right: 0;
        bottom: var(--vaadin-overlay-viewport-bottom);
        left: 0;

        /* Use flexbox alignment for the overlay part. */
        display: flex;
        flex-direction: column; /* makes dropdowns sizing easier */
        /* Align to center by default. */
        align-items: center;
        justify-content: center;

        /* Allow centering when max-width/max-height applies. */
        margin: auto;

        /* The host is not clickable, only the overlay part is. */
        pointer-events: none;

        /* Remove tap highlight on touch devices. */
        -webkit-tap-highlight-color: transparent;

        /* CSS API for host */
        --vaadin-overlay-viewport-bottom: 0;
      }

      :host([hidden]),
      :host(:not([opened]):not([closing])) {
        display: none !important;
      }

      [part="overlay"] {
        -webkit-overflow-scrolling: touch;
        overflow: auto;
        pointer-events: auto;

        /* Prevent overflowing the host in MSIE 11 */
        max-width: 100%;
        box-sizing: border-box;

        -webkit-tap-highlight-color: initial; /* reenable tap highlight inside */
      }

      [part="backdrop"] {
        z-index: -1;
        content: "";
        background: rgba(0, 0, 0, 0.5);
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        pointer-events: auto;
      }
    </style>

    <div id="backdrop" part="backdrop" hidden\$="{{!withBackdrop}}"></div>
    <div part="overlay" id="overlay" tabindex="0">
      <div part="content" id="content">
        <slot></slot>
      </div>
    </div>
`}static get is(){return"vaadin-overlay"}static get properties(){return{opened:{type:Boolean,notify:!0,observer:"_openedChanged",reflectToAttribute:!0},owner:Element,renderer:Function,template:{type:Object,notify:!0},instanceProps:{type:Object},content:{type:Object,notify:!0},withBackdrop:{type:Boolean,value:!1,reflectToAttribute:!0},model:Object,modeless:{type:Boolean,value:!1,reflectToAttribute:!0,observer:"_modelessChanged"},hidden:{type:Boolean,reflectToAttribute:!0,observer:"_hiddenChanged"},focusTrap:{type:Boolean,value:!1},restoreFocusOnClose:{type:Boolean,value:!1},_mouseDownInside:{type:Boolean},_mouseUpInside:{type:Boolean},_instance:{type:Object},_originalContentPart:Object,_contentNodes:Array,_oldOwner:Element,_oldModel:Object,_oldTemplate:Object,_oldInstanceProps:Object,_oldRenderer:Object,_oldOpened:Boolean}}static get observers(){return["_templateOrRendererChanged(template, renderer, owner, model, instanceProps, opened)"]}constructor(){super(),this._boundMouseDownListener=this._mouseDownListener.bind(this),this._boundMouseUpListener=this._mouseUpListener.bind(this),this._boundOutsideClickListener=this._outsideClickListener.bind(this),this._boundKeydownListener=this._keydownListener.bind(this),this._observer=new iq(this,e=>{this._setTemplateFromNodes(e.addedNodes)}),this._boundIronOverlayCanceledListener=this._ironOverlayCanceled.bind(this),/iPad|iPhone|iPod/.test(navigator.userAgent)&&(this._boundIosResizeListener=()=>this._detectIosNavbar())}ready(){super.ready(),this._observer.flush(),this.addEventListener("click",()=>{}),this.$.backdrop.addEventListener("click",()=>{})}_detectIosNavbar(){if(!this.opened)return;let e=window.innerHeight,t=window.innerWidth,r=document.documentElement.clientHeight;t>e&&r>e?this.style.setProperty("--vaadin-overlay-viewport-bottom",r-e+"px"):this.style.setProperty("--vaadin-overlay-viewport-bottom","0")}_setTemplateFromNodes(e){this.template=e.filter(e=>e.localName&&"template"===e.localName)[0]||this.template}close(e){var t=new CustomEvent("vaadin-overlay-close",{bubbles:!0,cancelable:!0,detail:{sourceEvent:e}});this.dispatchEvent(t),t.defaultPrevented||(this.opened=!1)}connectedCallback(){super.connectedCallback(),this._boundIosResizeListener&&(this._detectIosNavbar(),window.addEventListener("resize",this._boundIosResizeListener))}disconnectedCallback(){super.disconnectedCallback(),this._boundIosResizeListener&&window.removeEventListener("resize",this._boundIosResizeListener)}_ironOverlayCanceled(e){e.preventDefault()}_mouseDownListener(e){this._mouseDownInside=e.composedPath().indexOf(this.$.overlay)>=0}_mouseUpListener(e){this._mouseUpInside=e.composedPath().indexOf(this.$.overlay)>=0}_outsideClickListener(e){if(-1!==e.composedPath().indexOf(this.$.overlay)||this._mouseDownInside||this._mouseUpInside){this._mouseDownInside=!1,this._mouseUpInside=!1;return}if(!this._last)return;let t=new CustomEvent("vaadin-overlay-outside-click",{bubbles:!0,cancelable:!0,detail:{sourceEvent:e}});this.dispatchEvent(t),this.opened&&!t.defaultPrevented&&this.close(e)}_keydownListener(e){if(this._last){if("Tab"===e.key&&this.focusTrap&&!e.defaultPrevented)this._cycleTab(e.shiftKey?-1:1),e.preventDefault();else if("Escape"===e.key||"Esc"===e.key){let t=new CustomEvent("vaadin-overlay-escape-press",{bubbles:!0,cancelable:!0,detail:{sourceEvent:e}});this.dispatchEvent(t),this.opened&&!t.defaultPrevented&&this.close(e)}}}_ensureTemplatized(){this._setTemplateFromNodes(Array.from(this.children))}_openedChanged(e,t){this._instance||this._ensureTemplatized(),e?(this.__restoreFocusNode=this._getActiveElement(),this._animatedOpening(),s7(this,()=>{this.focusTrap&&!this.contains(document._activeElement||document.activeElement)&&this._cycleTab(0,0);let e=new CustomEvent("vaadin-overlay-open",{bubbles:!0});this.dispatchEvent(e)}),this.modeless||this._addGlobalListeners()):t&&(this._animatedClosing(),this.modeless||this._removeGlobalListeners())}_hiddenChanged(e){e&&this.hasAttribute("closing")&&this._flushAnimation("closing")}_shouldAnimate(){let e=getComputedStyle(this).getPropertyValue("animation-name"),t="none"===getComputedStyle(this).getPropertyValue("display");return!t&&e&&"none"!=e}_enqueueAnimation(e,t){let r=`__${e}Handler`,i=e=>{e&&e.target!==this||(t(),this.removeEventListener("animationend",i),delete this[r])};this[r]=i,this.addEventListener("animationend",i)}_flushAnimation(e){let t=`__${e}Handler`;"function"==typeof this[t]&&this[t]()}_animatedOpening(){this.parentNode===document.body&&this.hasAttribute("closing")&&this._flushAnimation("closing"),this._attachOverlay(),this.modeless||this._enterModalState(),this.setAttribute("opening","");let e=()=>{document.addEventListener("iron-overlay-canceled",this._boundIronOverlayCanceledListener),this.removeAttribute("opening")};this._shouldAnimate()?this._enqueueAnimation("opening",e):e()}_attachOverlay(){this._placeholder=document.createComment("vaadin-overlay-placeholder"),this.parentNode.insertBefore(this._placeholder,this),document.body.appendChild(this),this.bringToFront()}_animatedClosing(){if(this.hasAttribute("opening")&&this._flushAnimation("opening"),this._placeholder){if(this._exitModalState(),this.restoreFocusOnClose&&this.__restoreFocusNode){let e=this._getActiveElement();(e===document.body||this._deepContains(e))&&this.__restoreFocusNode.focus(),this.__restoreFocusNode=null}this.setAttribute("closing","");let e=()=>{document.removeEventListener("iron-overlay-canceled",this._boundIronOverlayCanceledListener),this._detachOverlay(),this.shadowRoot.querySelector('[part="overlay"]').style.removeProperty("pointer-events"),this.removeAttribute("closing")};this._shouldAnimate()?this._enqueueAnimation("closing",e):e()}}_detachOverlay(){this._placeholder.parentNode.insertBefore(this,this._placeholder),this._placeholder.parentNode.removeChild(this._placeholder)}static get __attachedInstances(){return Array.from(document.body.children).filter(e=>e instanceof al&&!e.hasAttribute("closing")).sort((e,t)=>e.__zIndex-t.__zIndex||0)}get _last(){return this===al.__attachedInstances.pop()}_modelessChanged(e){e?(this._removeGlobalListeners(),this._exitModalState()):this.opened&&(this._addGlobalListeners(),this._enterModalState())}_addGlobalListeners(){document.addEventListener("mousedown",this._boundMouseDownListener),document.addEventListener("mouseup",this._boundMouseUpListener),document.documentElement.addEventListener("click",this._boundOutsideClickListener,!0),document.addEventListener("keydown",this._boundKeydownListener)}_enterModalState(){"none"!==document.body.style.pointerEvents&&(this._previousDocumentPointerEvents=document.body.style.pointerEvents,document.body.style.pointerEvents="none"),al.__attachedInstances.forEach(e=>{e!==this&&(e.shadowRoot.querySelector('[part="overlay"]').style.pointerEvents="none")})}_removeGlobalListeners(){document.removeEventListener("mousedown",this._boundMouseDownListener),document.removeEventListener("mouseup",this._boundMouseUpListener),document.documentElement.removeEventListener("click",this._boundOutsideClickListener,!0),document.removeEventListener("keydown",this._boundKeydownListener)}_exitModalState(){let e;void 0!==this._previousDocumentPointerEvents&&(document.body.style.pointerEvents=this._previousDocumentPointerEvents,delete this._previousDocumentPointerEvents);let t=al.__attachedInstances;for(;(e=t.pop())&&(e===this||(e.shadowRoot.querySelector('[part="overlay"]').style.removeProperty("pointer-events"),e.modeless)););}_removeOldContent(){this.content&&this._contentNodes&&(this._observer.disconnect(),this._contentNodes.forEach(e=>{e.parentNode===this.content&&this.content.removeChild(e)}),this._originalContentPart&&(this.$.content.parentNode.replaceChild(this._originalContentPart,this.$.content),this.$.content=this._originalContentPart,this._originalContentPart=void 0),this._observer.connect(),this._contentNodes=void 0,this.content=void 0)}_stampOverlayTemplate(e,t){this._removeOldContent(),e._Templatizer||(e._Templatizer=o$(e,this,{instanceProps:t,forwardHostProp:function(e,t){this._instance&&this._instance.forwardHostProp(e,t)}})),this._instance=new e._Templatizer({}),this._contentNodes=Array.from(this._instance.root.childNodes);let r=e._templateRoot||(e._templateRoot=e.getRootNode()),i=r!==document;if(i){let e=window.ShadyCSS&&!window.ShadyCSS.nativeShadow;this.$.content.shadowRoot||this.$.content.attachShadow({mode:"open"});let t=Array.from(r.querySelectorAll("style")).reduce((e,t)=>e+t.textContent,"");if(e){let e=window.ShadyCSS.ScopingShim._styleInfoForNode(r.host);e&&(t+=e._getStyleRules().parsedCssText+"}")}if(t=t.replace(/:host/g,":host-nomatch")){if(e){let e=ao(t);e.id="content",e.setAttribute("part","content"),this.$.content.parentNode.replaceChild(e,this.$.content),e.className=this.$.content.className,this._originalContentPart=this.$.content,this.$.content=e}else{let e=document.createElement("style");e.textContent=t,this.$.content.shadowRoot.appendChild(e),this._contentNodes.unshift(e)}}this.$.content.shadowRoot.appendChild(this._instance.root),this.content=this.$.content.shadowRoot}else this.appendChild(this._instance.root),this.content=this}_removeNewRendererOrTemplate(e,t,r,i){e!==t?this.template=void 0:r!==i&&(this.renderer=void 0)}render(){this.renderer&&this.renderer.call(this.owner,this.content,this.owner,this.model)}_templateOrRendererChanged(e,t,r,i,n,s){if(e&&t)throw this._removeNewRendererOrTemplate(e,this._oldTemplate,t,this._oldRenderer),Error("You should only use either a renderer or a template for overlay content");let o=this._oldOwner!==r||this._oldModel!==i;this._oldModel=i,this._oldOwner=r;let a=this._oldInstanceProps!==n||this._oldTemplate!==e;this._oldInstanceProps=n,this._oldTemplate=e;let l=this._oldRenderer!==t;this._oldRenderer=t;let d=this._oldOpened!==s;if(this._oldOpened=s,e&&a)this._stampOverlayTemplate(e,n);else if(t&&(l||d||o)){if(this.content=this,l)for(;this.content.firstChild;)this.content.removeChild(this.content.firstChild);s&&this.render()}}_isFocused(e){return e&&e.getRootNode().activeElement===e}_focusedIndex(e){return(e=e||this._getFocusableElements()).indexOf(e.filter(this._isFocused).pop())}_cycleTab(e,t){let r=this._getFocusableElements();void 0===t&&(t=this._focusedIndex(r)),(t+=e)>=r.length?t=0:t<0&&(t=r.length-1),r[t].focus()}_getFocusableElements(){return ai.getTabbableNodes(this.$.overlay)}_getActiveElement(){let e=document._activeElement||document.activeElement;for(e&&e!==document.documentElement&&e instanceof Element!=!1||(e=document.body);e.shadowRoot&&e.shadowRoot.activeElement;)e=e.shadowRoot.activeElement;return e}_deepContains(e){if(this.contains(e))return!0;let t=e,r=e.ownerDocument;for(;t&&t!==r&&t!==this;)t=t.parentNode||t.host;return t===this}bringToFront(){let e="",t=al.__attachedInstances.filter(e=>e!==this).pop();if(t){let r=t.__zIndex;e=r+1}this.style.zIndex=e,this.__zIndex=e||parseFloat(getComputedStyle(this).zIndex)}}customElements.define(al.is,al),/**
 * @license
 * Copyright (c) 2020 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */e5("vaadin-context-menu-overlay",eQ`
    :host {
      align-items: flex-start;
      justify-content: flex-start;
    }

    :host([right-aligned]),
    :host([end-aligned]) {
      align-items: flex-end;
    }

    :host([bottom-aligned]) {
      justify-content: flex-end;
    }

    [part='overlay'] {
      background-color: #fff;
    }
  `,{moduleId:"vaadin-context-menu-overlay-styles"});class ad extends al{static get is(){return"vaadin-context-menu-overlay"}static get properties(){return{instanceProps:{type:Object,value:()=>({detail:!0,target:!0})},parentOverlay:{type:Object,readOnly:!0}}}static get observers(){return["_themeChanged(theme)"]}ready(){super.ready(),this.addEventListener("keydown",e=>{if(!e.defaultPrevented&&e.composedPath()[0]===this.$.overlay&&[38,40].indexOf(e.keyCode)>-1){let t=this.getFirstChild();t&&Array.isArray(t.items)&&t.items.length&&(e.preventDefault(),38===e.keyCode?t.items[t.items.length-1].focus():t.focus())}})}getFirstChild(){return this.content.querySelector(":not(style):not(slot)")}_themeChanged(){this.close()}getBoundaries(){let e=this.getBoundingClientRect(),t=this.$.overlay.getBoundingClientRect(),r=e.bottom-t.height,i=this.parentOverlay;if(i&&i.hasAttribute("bottom-aligned")){let e=getComputedStyle(i);r=r-parseFloat(e.bottom)-parseFloat(e.height)}return{xMax:e.right-t.width,xMin:e.left+t.width,yMax:r,left:e.left,right:e.right,top:e.top,width:t.width}}}customElements.define(ad.is,ad);/**
 * @license
 * Copyright (c) 2020 Vaadin Ltd.
 * This program is available under Apache License Version 2.0, available at https://vaadin.com/license/
 */class ac extends i8(iC(nQ(nX(iS)))){static get template(){return iw`
      <style>
        :host {
          display: block;
        }

        :host([hidden]) {
          display: none !important;
        }
      </style>

      <slot id="slot"></slot>

      <vaadin-device-detector phone="{{_phone}}" touch="{{_touch}}"></vaadin-device-detector>

      <vaadin-context-menu-overlay
        id="overlay"
        on-opened-changed="_onOverlayOpened"
        on-vaadin-overlay-open="_onVaadinOverlayOpen"
        with-backdrop="[[_phone]]"
        phone$="[[_phone]]"
        model="[[_context]]"
        theme$="[[theme]]"
      >
      </vaadin-context-menu-overlay>
    `}static get is(){return"vaadin-context-menu"}static get version(){return"5.0.0"}static get properties(){return{selector:{type:String},opened:{type:Boolean,value:!1,notify:!0,readOnly:!0},openOn:{type:String,value:"vaadin-contextmenu"},listenOn:{type:Object,value:function(){return this}},closeOn:{type:String,value:"click",observer:"_closeOnChanged"},renderer:{type:Function},_context:Object,_boundClose:Object,_boundOpen:Object,_contentTemplate:Object,_oldTemplate:Object,_oldRenderer:Object,_touch:Boolean}}static get observers(){return["_openedChanged(opened)","_contextChanged(_context, _instance)","_targetOrOpenOnChanged(listenOn, openOn)","_templateOrRendererChanged(_contentTemplate, renderer, _context, items)"]}constructor(){super(),this._boundOpen=this.open.bind(this),this._boundClose=this.close.bind(this),this._boundOnGlobalContextMenu=this._onGlobalContextMenu.bind(this)}connectedCallback(){super.connectedCallback(),this.__boundOnScroll=this.__onScroll.bind(this),window.addEventListener("scroll",this.__boundOnScroll,!0)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("scroll",this.__boundOnScroll,!0),this.close()}ready(){super.ready(),this._observer=new iq(this,e=>{this._setTemplateFromNodes(e.addedNodes)})}_setTemplateFromNodes(e){this._contentTemplate=e.filter(e=>e.localName&&"template"===e.localName)[0]||this._contentTemplate}_onOverlayOpened(e){this._setOpened(e.detail.value),this.__alignOverlayPosition()}_onVaadinOverlayOpen(){this.__alignOverlayPosition(),this.$.overlay.style.opacity="",this.__forwardFocus()}_targetOrOpenOnChanged(e,t){this._oldListenOn&&this._oldOpenOn&&(this._unlisten(this._oldListenOn,this._oldOpenOn,this._boundOpen),this._oldListenOn.style.webkitTouchCallout="",this._oldListenOn.style.webkitUserSelect="",this._oldListenOn.style.userSelect="",this._oldListenOn=null,this._oldOpenOn=null),e&&t&&(this._listen(e,t,this._boundOpen),this._oldListenOn=e,this._oldOpenOn=t)}_setListenOnUserSelect(e){this.listenOn.style.webkitTouchCallout=e,this.listenOn.style.webkitUserSelect=e,this.listenOn.style.userSelect=e,document.getSelection().removeAllRanges()}_closeOnChanged(e,t){let r="vaadin-overlay-outside-click";t&&(this._unlisten(this.$.overlay,t,this._boundClose),this._unlisten(this.$.overlay.root,t,this._boundClose)),e?(this._listen(this.$.overlay,e,this._boundClose),this._listen(this.$.overlay.root,e,this._boundClose),this._unlisten(this.$.overlay,r,this._preventDefault)):this._listen(this.$.overlay,r,this._preventDefault)}_preventDefault(e){e.preventDefault()}_openedChanged(e){e?(this._instance||(this.$.overlay.template=this.querySelector("template"),this._instance=this.$.overlay._instance),document.documentElement.addEventListener("contextmenu",this._boundOnGlobalContextMenu,!0),this._setListenOnUserSelect("none")):(document.documentElement.removeEventListener("contextmenu",this._boundOnGlobalContextMenu,!0),this._setListenOnUserSelect("")),this.$.overlay.opened=e}render(){this.$.overlay.render()}_removeNewRendererOrTemplate(e,t,r,i){e!==t?this._contentTemplate=void 0:r!==i&&(this.renderer=void 0)}_templateOrRendererChanged(e,t,r,i){if(e&&t)throw this._removeNewRendererOrTemplate(e,this._oldTemplate,t,this._oldRenderer),Error("You should only use either a renderer or a template for context-menu content");if(this._oldTemplate=e,this._oldRenderer=t,i){if(e||t)throw Error("The items API cannot be used together with a template/renderer");"click"===this.closeOn&&(this.closeOn=""),t=this.__itemsRenderer}t&&r&&this.$.overlay.setProperties({owner:this,renderer:t})}_contextChanged(e,t){void 0!==e&&void 0!==t&&(t.detail=e.detail,t.target=e.target)}close(){this._setOpened(!1)}_contextTarget(e){if(!this.selector)return e.target;{let t=this.listenOn.querySelectorAll(this.selector);return Array.prototype.filter.call(t,t=>e.composedPath().indexOf(t)>-1)[0]}}open(e){e&&!this.opened&&(this._context={detail:e.detail,target:this._contextTarget(e)},this._context.target&&(this._preventDefault(e),e.stopPropagation(),this.__x=this._getEventCoordinate(e,"x"),this.__pageXOffset=window.pageXOffset,this.__y=this._getEventCoordinate(e,"y"),this.__pageYOffset=window.pageYOffset,this.$.overlay.style.opacity="0",this._setOpened(!0)))}__onScroll(){if(!this.opened)return;let e=window.pageYOffset-this.__pageYOffset,t=window.pageXOffset-this.__pageXOffset;this.__adjustPosition("left",-t),this.__adjustPosition("right",t),this.__adjustPosition("top",-e),this.__adjustPosition("bottom",e),this.__pageYOffset+=e,this.__pageXOffset+=t}__adjustPosition(e,t){let r=this.$.overlay,i=r.style;i[e]=(parseInt(i[e])||0)+t+"px"}__alignOverlayPosition(){let e;let t=this.$.overlay,r=t.style;["top","right","bottom","left"].forEach(e=>r.removeProperty(e)),["right-aligned","end-aligned","bottom-aligned"].forEach(e=>t.removeAttribute(e));let{xMax:i,xMin:n,yMax:s,left:o,right:a,top:l,width:d}=t.getBoundaries(),c=this.__x||(this.__isRTL?a:o),u=this.__y||l,h=document.documentElement.clientWidth,p=document.documentElement.clientHeight,m=t.parentOverlay,f=!1;if(m){if(e=m.$.overlay.getBoundingClientRect(),m.hasAttribute("right-aligned")||m.hasAttribute("end-aligned")){let i=getComputedStyle(m),n=(e,t)=>parseFloat(getComputedStyle(e.$.content)["padding"+t]),s=parseFloat(i[this.__isRTL?"left":"right"])+e.width,o=n(m,"Left")+n(t,"Right");h-(s-o)>d&&(this._setEndAligned(t),r[this.__isRTL?"left":"right"]=s+"px",f=!0)}else c<e.x&&(c-=d-e.width)}f||(this.__isRTL?(c>h/2||c>n)&&!m?r.right=Math.max(0,h-c)+"px":m&&e.left>=e.width?r.right=h-e.right+e.width+"px":m?(r.right="auto",r.left=Math.max(t.getBoundingClientRect().left-t.getBoundingClientRect().width,e.right)+"px",this._setEndAligned(t)):(r.left=c+"px",this._setEndAligned(t)):(c<h/2||c<i)&&!m?r.left=c+"px":m&&h-e.width-e.left>=e.width?r.left=e.left+e.width+"px":m?(r.right="auto",r.left=Math.max(t.getBoundingClientRect().left,e.left-t.getBoundingClientRect().width)+"px",this._setEndAligned(t)):(r.right=Math.max(0,h-c)+"px",this._setEndAligned(t))),u<p/2||u<s?r.top=u+"px":(r.bottom=Math.max(0,p-u)+"px",t.setAttribute("bottom-aligned",""))}_setEndAligned(e){e.setAttribute("end-aligned",""),this.__isRTL||e.setAttribute("right-aligned","")}_getEventCoordinate(e,t){if(e.detail instanceof Object){if(e.detail[t])return e.detail[t];if(e.detail.sourceEvent)return this._getEventCoordinate(e.detail.sourceEvent,t)}else{let r="client"+t.toUpperCase(),i=e.changedTouches?e.changedTouches[0][r]:e[r];if(0!==i)return i;{let r=e.target.getBoundingClientRect();return"x"===t?r.left:r.top+r.height}}}_listen(e,t,r){nN[t]?nD(e,t,r):e.addEventListener(t,r)}_unlisten(e,t,r){nN[t]?nz(e,t,r):e.removeEventListener(t,r)}_onGlobalContextMenu(e){e.shiftKey||(e.preventDefault(),this.close())}}function au(e,{target:t=document.body}={}){let r=document.createElement("textarea"),i=document.activeElement;r.value=e,r.setAttribute("readonly",""),r.style.contain="strict",r.style.position="absolute",r.style.left="-9999px",r.style.fontSize="12pt";let n=document.getSelection(),s=!1;n.rangeCount>0&&(s=n.getRangeAt(0)),t.append(r),r.select(),r.selectionStart=0,r.selectionEnd=e.length;let o=!1;try{o=document.execCommand("copy")}catch{}return r.remove(),s&&(n.removeAllRanges(),n.addRange(s)),i&&i.focus(),o}customElements.define(ac.is,ac);var ah=a(571),ap=a(245),am=a.n(ap);let af=class extends v.BaseComponent{constructor(e,t,r){super(),this.element=t,this.modalInstance=r,this.subscribeUntilDestroyed(e.key,e=>{"keydown"===e.type&&"Enter"===e.key&&void 0!==this.options.defaultId&&this.modalInstance.close(this.options.defaultId)})}ngAfterViewInit(){this.element.nativeElement.querySelector("button[autofocus]").focus()}onButton(e){this.modalInstance.close(e)}};af.ctorParameters=()=>[{type:v.HotkeysService},{type:y.ElementRef},{type:ah.NgbActiveModal}],af.propDecorators={options:[{type:y.Input}]},af=h([(0,y.Component)({template:am()}),p("design:paramtypes",[v.HotkeysService,y.ElementRef,ah.NgbActiveModal])],af);var a_=a(78),ay=a.n(a_),ag=a(922),av=a.n(ag),ab=a(127),aw=a.n(ab),aS=a(686),aC=a.n(aS),aA=a(687),aP=a.n(aA),ax=a(500),aE=a.n(ax),aO=a(811),aT={};aT.styleTagTransform=aE(),aT.setAttributes=aC(),aT.insert=aw().bind(null,"head"),aT.domAPI=av(),aT.insertStyleElement=aP();var aM=ay()(aO.Z,aT);aO.Z&&aO.Z.locals&&aO.Z.locals;let aN=class extends v.PlatformService{constructor(e,t){super(),this.connector=e,this.ngbModal=t,this.contextMenuHandlers=new Map,this.menu=window.document.createElement("vaadin-context-menu"),this.menu.addEventListener("item-selected",e=>{var t;null===(t=this.contextMenuHandlers.get(e.detail.value))||void 0===t||t()}),document.body.appendChild(this.menu),this.fileSelector=document.createElement("input"),this.fileSelector.type="file",this.fileSelector.style.visibility="hidden",document.body.appendChild(this.fileSelector)}readClipboard(){return""}setClipboard(e){au(e.text)}loadConfig(){return m(this,void 0,void 0,function*(){return this.connector.loadConfig()})}saveConfig(e){return m(this,void 0,void 0,function*(){yield this.connector.saveConfig(e)})}getOSRelease(){return"1.0"}openExternal(e){window.open(e)}getAppVersion(){return this.connector.getAppVersion()}listFonts(){return m(this,void 0,void 0,function*(){return[]})}popupContextMenu(e,t){this.contextMenuHandlers.clear(),this.menu.items=e.filter(e=>"separator"!==e.type).map(e=>this.remapMenuItem(e)),setTimeout(()=>{this.menu.open(t)},10)}remapMenuItem(e){var t,r;let i={text:e.label,disabled:!(null===(t=e.enabled)||void 0===t||t),checked:e.checked,children:null===(r=e.submenu)||void 0===r?void 0:r.map(e=>this.remapMenuItem(e))};return e.click&&this.contextMenuHandlers.set(i,e.click),i}showMessageBox(e){var t;return m(this,void 0,void 0,function*(){let r=this.ngbModal.open(af,{backdrop:"static"}),i=r.componentInstance;i.options=e;try{let e=yield r.result;return{response:e}}catch(r){return{response:null!==(t=e.cancelId)&&void 0!==t?t:1}}})}quit(){window.close()}startDownload(e,t,r){return m(this,void 0,void 0,function*(){let i=new ak(e,t,r);return this.fileTransferStarted.next(i),i})}startUpload(e){return new Promise(t=>{this.fileSelector.onchange=()=>{var r;let i=[],n=this.fileSelector.files;for(let t=0;t<(null!==(r=n.length)&&void 0!==r?r:0);t++){let r=n[t],s=new v.HTMLFileUpload(r);if(this.fileTransferStarted.next(s),i.push(s),!(null==e?void 0:e.multiple))break}t(i)},this.fileSelector.click()})}setErrorHandler(e){window.addEventListener("error",e)}pickDirectory(){return m(this,void 0,void 0,function*(){throw Error("Unsupported")})}};aN.ctorParameters=()=>[{type:void 0,decorators:[{type:y.Inject,args:["WEB_CONNECTOR"]}]},{type:ah.NgbModal}],aN=h([(0,y.Injectable)(),p("design:paramtypes",[Object,ah.NgbModal])],aN);class ak extends v.FileDownload{constructor(e,t,r){super(),this.name=e,this.mode=t,this.size=r,this.buffers=[]}getName(){return this.name}getMode(){return this.mode}getSize(){return this.size}write(e){return m(this,void 0,void 0,function*(){this.buffers.push(Buffer.from(e)),this.increaseProgress(e.length),this.isComplete()&&this.finish()})}finish(){let e=new Blob(this.buffers,{type:"application/octet-stream"}),t=window.document.createElement("a");t.href=window.URL.createObjectURL(e),t.download=this.name,document.body.appendChild(t),t.click(),document.body.removeChild(t)}close(){}}let aI=class{create(e){return new v.ConsoleLogger(e)}};aI=h([(0,y.Injectable)({providedIn:"root"})],aI);class aL extends v.UpdaterService{check(){return m(this,void 0,void 0,function*(){return!1})}update(){return m(this,void 0,void 0,function*(){})}}let aR=class extends v.HostWindowService{get isFullscreen(){return!!document.fullscreenElement}constructor(e,t){super(),this.windowShown.next(),this.windowFocused.next();let r=i=>{e.store.web.preventAccidentalTabClosure?(i.preventDefault(),i.returnValue=t.instant("Are you sure you want to close Tabby? You can disable this prompt in Settings -> Window.")):window.removeEventListener("beforeunload",r)};window.addEventListener("beforeunload",r)}reload(){location.reload()}setTitle(e){document.title=null!=e?e:"Tabby"}toggleFullscreen(){this.isFullscreen?document.exitFullscreen():document.body.requestFullscreen({navigationUI:"hide"})}minimize(){throw Error("Unavailable")}isMaximized(){return!0}toggleMaximize(){throw Error("Unavailable")}close(){window.close()}};aR.ctorParameters=()=>[{type:v.ConfigService},{type:v.TranslateService}],aR=h([(0,y.Injectable)({providedIn:"root"}),p("design:paramtypes",[v.ConfigService,v.TranslateService])],aR);var aF=a(441),aD=a.n(aF);let az=class extends v.HostAppService{get platform(){return v.Platform.Web}get configPlatform(){var e,t;let r=aD().parse(window.navigator.userAgent).os;return null!==(t=v.Platform[null!==(e=r.name)&&void 0!==e?e:"Windows"])&&void 0!==t?t:v.Platform.Windows}constructor(e){super(e)}newWindow(){throw Error("Not implemented")}relaunch(){location.reload()}quit(){window.close()}};az.ctorParameters=()=>[{type:y.Injector}],az=h([(0,y.Injectable)(),p("design:paramtypes",[y.Injector])],az);class aB extends v.ConfigProvider{constructor(){super(...arguments),this.defaults={web:{preventAccidentalTabClosure:!1}}}}let aj=class{};aj=h([(0,y.NgModule)({imports:[g.CommonModule],providers:[{provide:v.PlatformService,useClass:aN},{provide:v.LogService,useClass:aI},{provide:v.UpdaterService,useClass:aL},{provide:v.HostWindowService,useClass:aR},{provide:v.HostAppService,useClass:az},{provide:v.ConfigProvider,useClass:aB,multi:!0}],declarations:[af]})],aj);let aH=aj})(),l})());