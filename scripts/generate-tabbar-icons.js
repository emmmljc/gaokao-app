/**
 * SVG to PNG 转换脚本 - 用于生成微信小程序 TabBar 图标
 * 
 * 使用方法:
 * 1. 安装依赖: npm install sharp
 * 2. 运行脚本: node scripts/generate-tabbar-icons.js
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了 sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  未安装 sharp 库，请先运行: npm install sharp --save-dev');
  console.log('\n或者使用在线转换工具:');
  console.log('1. 访问 https://convertio.co/zh/svg-png/');
  console.log('2. 上传 SVG 文件');
  console.log('3. 下载 PNG 文件到 src/assets/tabbar/ 目录');
  process.exit(1);
}

const tabbarDir = path.join(__dirname, '..', 'src', 'assets', 'tabbar');

const icons = [
  { svg: 'home.svg', png: 'home.png' },
  { svg: 'home-active.svg', png: 'home-active.png' },
  { svg: 'major.svg', png: 'major.png' },
  { svg: 'major-active.svg', png: 'major-active.png' },
  { svg: 'recommend.svg', png: 'recommend.png' },
  { svg: 'recommend-active.svg', png: 'recommend-active.png' },
  { svg: 'profile.svg', png: 'profile.png' },
  { svg: 'profile-active.svg', png: 'profile-active.png' },
];

async function convert() {
  console.log('🎨 正在生成 TabBar 图标...\n');
  
  for (const icon of icons) {
    const svgPath = path.join(tabbarDir, icon.svg);
    const pngPath = path.join(tabbarDir, icon.png);
    
    if (!fs.existsSync(svgPath)) {
      console.log(`❌ 跳过: ${icon.svg} (文件不存在)`);
      continue;
    }
    
    try {
      await sharp(svgPath)
        .resize(81, 81)
        .png({ compressionLevel: 9 })
        .toFile(pngPath);
      
      const stats = fs.statSync(pngPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      const status = stats.size < 40 * 1024 ? '✅' : '⚠️';
      
      console.log(`${status} ${icon.png.padEnd(25)} ${sizeKB.padStart(6)} KB`);
    } catch (err) {
      console.log(`❌ 失败: ${icon.png} - ${err.message}`);
    }
  }
  
  console.log('\n✨ 转换完成！');
  console.log('📁 图标位置: src/assets/tabbar/');
  console.log('📏 尺寸: 81x81 像素');
  console.log('📦 限制: 每个图标必须 < 40KB');
}

convert();
