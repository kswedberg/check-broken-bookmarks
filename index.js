/* eslint-disable no-await-in-loop */
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const {promisify} = require('util');
const {peach} = require('@bamf-health/bamfjs/cjs/promise.js');
const {PromisePool} = require('@supercharge/promise-pool');

const open = promisify(fs.open);
const appendFile = promisify(fs.appendFile);
const {getConfig} = require('./config.js');
const {
  getGoodLinks,
  isUrlPermittedWithStatus,
  isUrlPermitted,
  outputBroken,
  handleSignal,
  axios,
} = require('./utils.js');

const findBroken = async() => {
  const config = await getConfig();
  const {browser} = config;

  let fails = 0;
  let succeeds = 0;
  const broken = [];

  const src = require(path.join(process.cwd(), config.src));
  const bookmarks = src
  .filter(({url}) => {
    return url && url.startsWith('http');
  })
  .slice(config.start, config.end);

  const goodLinks = await getGoodLinks(config.good);
  const fd = await open(path.join(process.cwd(), config.good), 'a');

  console.log('Using config:', config);
  console.log(chalk.cyan(`Testing ${bookmarks.length} bookmarks for broken links...`));

  process.on('SIGINT', handleSignal({broken, succeeds, fd, browser}));
  process.on('SIGTERM', handleSignal({broken, succeeds, fd, browser}));

  await PromisePool.for(bookmarks)
  .process(async(item, index, pool) => {
    const {url, title} = item;
    const current = index + 1;

    if (goodLinks.has(url) || isUrlPermitted(url)) {
      return;
    }

    try {
      // @ts-ignore
      await axios.get(url);
      succeeds++;
      console.log(chalk.green(`SUCCESS (${succeeds} at ${current}):`), title, url);

      if (!goodLinks.has(url)) {
        await appendFile(fd, `${url}\n`, 'utf8');
      }

    } catch (err) {
      const response = err && err.response || {status: -1};
      const {status, statusText} = response;
      const brokenItem = Object.assign({status, statusText}, item);

      if (isUrlPermittedWithStatus(url, status)) {
        return;
      }
      fails++;
      broken.push(brokenItem);
      console.log(chalk.red(`FAIL (${fails} at ${current}):`), title, url);

      return brokenItem;
    }
  });
  // const results = await peach(bookmarks, async(item, index) => {
  //   const {url, title} = item;
  //   const current = index + 1;

  //   if (goodLinks.has(url) || /vivaldi|caddyserver|codepen/.test(url)) {
  //     return;
  //   }

  //   try {
  //     // @ts-ignore
  //     await axios.get(url);
  //     succeeds++;
  //     console.log(chalk.green(`SUCCESS (${succeeds} at ${current}):`), title, url);

  //     if (!goodLinks.has(url)) {
  //       await appendFile(fd, `${url}\n`, 'utf8');
  //     }

  //   } catch (err) {
  //     fails++;
  //     const response = err && err.response || {status: -1};
  //     const {status, statusText} = response;
  //     const brokenItem = Object.assign({status, statusText}, item);

  //     broken.push(brokenItem);
  //     console.log(chalk.red(`FAIL (${fails} at ${current}):`), title, url);

  //     return brokenItem;
  //   }
  // });


  await outputBroken({broken, succeeds, fd, browser: config.browser});
};

try {
  findBroken();
} catch (err) {
  console.log('ERROR!!');
  console.log(err);
}
