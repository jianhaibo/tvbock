const fs = require('fs');
const path = require('path');

// 查找所有 JSON 文件
function findJsonFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = [...results, ...findJsonFiles(file)];
    } else if (path.extname(file) === '.json') {
      results.push(file);
    }
  });
  return results;
}

// 处理站点配置文件，删除包含 jar 字段的站点
function processSiteConfig(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // 检查是否有 sites 字段
    if (data.sites && Array.isArray(data.sites)) {
      const originalLength = data.sites.length;
      
      // 过滤掉包含 jar 字段的站点
      data.sites = data.sites.filter(site => {
        return !site.jar;
      });
      
      // 如果有变化，保存文件
      if (data.sites.length !== originalLength) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        console.log(`Processed ${filePath}: removed ${originalLength - data.sites.length} sites with jar field`);
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// 处理 dx 开头的 JSON 文件，只替换 URL 中的仓库地址，保留加速代理前缀
function processDxFiles(filePath) {
  const fileName = path.basename(filePath);
  if (!fileName.startsWith('dx')) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    let updated = false;

    // 删除 name 字段包含"精简多线和嗷呜"的条目
    if (data.urls && Array.isArray(data.urls)) {
      const originalLength = data.urls.length;
      data.urls = data.urls.filter(urlObj => {
        if (urlObj.name && urlObj.name.includes("精简多线") || urlObj.name.includes("嗷呜")) {
          console.log(`Removed URL in ${fileName} with name containing '精简多线和嗷呜': ${urlObj.name}`);
          return false;
        }
        return true;
      });
      
      if (data.urls.length !== originalLength) {
        updated = true;
        console.log(`Removed ${originalLength - data.urls.length} URLs containing '精简多线和嗷呜' from ${fileName}`);
      }
    }
    
    // 替换 urls 中的仓库地址，保留加速代理前缀
    if (data.urls && Array.isArray(data.urls)) {
      data.urls = data.urls.map(urlObj => {
        if (urlObj.url) {
          // 只替换仓库路径部分，保留加速代理前缀
          const updatedUrl = urlObj.url.replace(
            /https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/(main|master)/,
            `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY.split('/')[0]}/tvbock/$1`
          );
          
          if (updatedUrl !== urlObj.url) {
            updated = true;
            console.log(`Updated URL in ${fileName}: ${urlObj.url} -> ${updatedUrl}`);
          }
          
          return { ...urlObj, url: updatedUrl };
        }
        return urlObj;
      });
    }
    
    // 如果有更新，保存文件
    if (updated) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
      console.log(`Processed ${filePath}: removed entries with '精简多线和嗷呜' and updated repository paths while preserving proxy prefixes`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// 主处理逻辑
const jsonFiles = findJsonFiles('.');
jsonFiles.forEach(filePath => {
  // 处理站点配置文件
  processSiteConfig(filePath);
  
  // 处理 dx 开头的文件
  processDxFiles(filePath);
});

console.log('Finished processing all JSON files');
