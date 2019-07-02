# ScrapyScrap

## Description

This repository is a small library to automate github scraping and post processing
repositories that fit your criterias

## How to use

You first need to place you a the root of the repository
then use these commands to install and launch the test :

```bash
npm install
```

Then you have to create a config.json containing your github api key

```bash
echo "{\"API_KEY\":\"YOUR_API_KEY\"}" >> config.json
```

Edit it to add your key.

Then you can test the library using the test.js file.

```bash
node test.js
```

You can see explore directly the [test file]("https://github.com/CuadrosNicolas/ScrapyScrap/blob/master/test.js") to see how to use the library and how to make your own scraping pipeline.