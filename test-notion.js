/**
 * 娴嬭瘯 Notion API 杩炴帴骞堕獙璇佹暟鎹簱閰嶇疆
 */

const { Client } = require('@notionhq/client');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID || '3187390d-2505-8008-eb54-fdf37de256b1f'; // 甯﹁繛瀛楃鏍煎紡

if (!NOTION_TOKEN) {
  console.error('Missing NOTION_TOKEN in environment');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

console.log('馃攳 姝ｅ湪杩炴帴 Notion API...\n');
console.log('馃摑 娴嬭瘯鏁版嵁搴擄細"涓汉绗旇"');
console.log('   鏁版嵁搴?ID: 3187390d2505808eb54fdf37de256b1f\n');

// 鍏堟祴璇曟暟鎹簱鏄惁鍙互璁块棶
notion.databases.retrieve({
  database_id: DATABASE_ID
}).then(db => {
  console.log('鉁?鏁版嵁搴撹繛鎺ユ垚鍔?\n');
  console.log(`馃搳 鏁版嵁搴撳悕绉帮細${db.title?.[0]?.plain_text || 'Untitled'}`);
  console.log(`馃搫 椤甸潰鏁伴噺锛?{db.number_of_pages || '鏈煡'}\n`);

  // 鎼滅储璇ユ暟鎹簱涓殑椤甸潰
  return notion.search({
    filter: {
      property: 'object',
      value: 'page'
    }
  });
}).then(response => {
  // 杩囨护鍑哄綋鍓嶆暟鎹簱鐨勯〉闈?  const pages = response.results.filter(page => {
    const parentId = page.parent?.database_id?.replace(/-/g, '') || '';
    return parentId === DATABASE_ID.replace(/-/g, '');
  });

  console.log(`馃搵 鎵惧埌 ${pages.length} 绡囨枃绔?\n`);

  if (pages.length === 0) {
    console.log('鈿狅笍 鏁版嵁搴撲腑娌℃湁鏂囩珷');
    console.log('\n璇锋坊鍔犳祴璇曟枃绔狅細');
    console.log('1. 鍦?Notion 涓墦寮€"涓汉绗旇"鏁版嵁搴?);
    console.log('2. 鐐瑰嚮"鏂板缓"娣诲姞涓€绡囨枃绔?);
    console.log('3. 濉啓鏍囬銆丼lug銆乀ags銆丆ategory 绛夊瓧娈?);
    console.log('4. 鍕鹃€?Published"');
    console.log('5. 淇濆瓨鍚庨噸鏂拌繍琛屾瀯寤篭n');
  }

  pages.forEach((page, index) => {
    const props = page.properties;
    const slug = props.Slug?.rich_text?.[0]?.plain_text ||
                 props.slug?.rich_text?.[0]?.plain_text ||
                 props.Name?.title?.[0]?.plain_text ||
                 'Untitled';
    const tags = props.Tags?.multi_select?.map(t => t.name) || [];
    const category = props.Category?.select?.name || '';
    const published = props.Published?.checkbox || false;
    const publishedAt = props.PublishedAt?.date?.start || '';

    console.log(`${index + 1}. ${slug}`);
    console.log(`   鏍囩锛?{tags.join(', ') || '鏃?}`);
    console.log(`   鍒嗙被锛?{category || '鏃?}`);
    console.log(`   鍙戝竷锛?{published ? '鉁? : '鉂?}`);
    console.log(`   鏃堕棿锛?{publishedAt || '鏃?}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('鉁?鏁版嵁搴撻厤缃纭紒');
  console.log('');
  console.log('馃摑 .env.local 閰嶇疆锛?);
  console.log('NOTION_DATABASE_ID=3187390d2505808eb54fdf37de256b1f');
  console.log('='.repeat(60));

  console.log('\n馃殌 姝ｅ湪杩愯鏋勫缓...\n');
  const { exec } = require('child_process');
  exec('npm run build', (error, stdout, stderr) => {
    if (error) {
      console.error('鏋勫缓澶辫触:', error.message);
      return;
    }
    console.log(stdout);
    if (stderr) console.error(stderr);
  });

}).catch(error => {
  console.error('鉂?鏁版嵁搴撹闂け璐?', error.message);
  console.error('\n閿欒璇︽儏:', error.body?.message || error.code || '');

  if (error.code === 'object_not_found') {
    console.error('\n馃敶 闂锛氶泦鎴愭病鏈夎繛鎺ュ埌璇ユ暟鎹簱');
    console.error('\n瑙ｅ喅鏂规硶锛?);
    console.error('1. 鍦?Notion 涓墦寮€"涓汉绗旇"鏁版嵁搴?);
    console.error('   閾炬帴锛歨ttps://www.notion.so/3187390d2505808eb54fdf37de256b1f');
    console.error('2. 鐐瑰嚮鍙充笂瑙?"..." 鈫?"杩炴帴鑷?');
    console.error('3. 閫夋嫨 "ddong_blog" 闆嗘垚');
    console.error('4. 纭杩炴帴鎴愬姛鍚庨噸鏂拌繍琛屾瀯寤?);
  } else {
    console.error('\n鍙兘鍘熷洜锛?);
    console.error('1. 鏁版嵁搴?ID 涓嶆纭?);
    console.error('2. Token 鏉冮檺涓嶈冻');
    console.error('3. 缃戠粶闂');
  }
});

