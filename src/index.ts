import yaml from "js-yaml";
import fs from "fs";
import axios from "axios";
import parser from 'node-html-parser';
import url from 'url';
import childproc from 'child_process';

const config_path = "./config.yml";
const link_base = "https://secure.newegg.com/Shopping/AddtoCart.aspx?Submit=ADD&ItemList=";

console.log(`Loading config from`, config_path);
const config = yaml.safeLoad(fs.readFileSync(config_path, "utf-8")) as any;

console.log(config);

const getStock = async () => {
    const result = await axios.get(config.sites.newegg_3080);
    const root = parser(result.data);

    const items = root.querySelectorAll('.item-cell');

    for(let i = 0; items[i]; i++) {
        let item = items[i];
        if(!item.id) {
            continue;
        }

        const inStock = item.querySelector('.item-operate .btn-mini').childNodes[0].rawText === 'Sold Out' ? false : true;

        const link = item.querySelector('a.item-title');

        const href = link.getAttribute('href') as string;
        const item_id = url.parse(href, true).query.Item;

        console.log(`${item_id} in stock? ${inStock}`);

        if(inStock) {
            const toopen = link_base + item_id;
            console.log('Open:', toopen);
            const safeurl = toopen.replace('?', "\\?").replace('=', "\\=").replace("&", "\\&");
            console.log(safeurl);
            childproc.exec(`open -a "Google Chrome" ${safeurl}`);
            return 30000;
        } 
    }
    return 50000;

};

getStock().finally();
let timer = 5000;
setInterval(() => {
    console.log('loop start');
    getStock().then(result => timer);
}, timer);


