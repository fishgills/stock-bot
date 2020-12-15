import yaml from "js-yaml";
import fs from "fs";
import axios from "axios";
import parser from 'node-html-parser';
import url from 'url';
import childproc from 'child_process';
import Table from 'cli-table';


const config_path = "./config.yml";
const link_base = "https://secure.newegg.com/Shopping/AddtoCart.aspx?Submit=ADD&ItemList=";

console.log(`Loading config from`, config_path);
const config = yaml.safeLoad(fs.readFileSync(config_path, "utf-8")) as any;

console.log(config);

const baseName = (str: string) => {
    let base = new String(str).substring(str.lastIndexOf('/') + 1); 
    if(base.lastIndexOf(".") != -1)       
        base = base.substring(0, base.lastIndexOf("."));
    return base;
}

const getStock = async () => {
    const result = await axios.get(config.sites.newegg_3080);
    const root = parser(result.data);
    const cells = root.querySelectorAll('.item-cell');

    const table = new Table({
        head: ['ID', 'In Stock', 'Name', 'Link'],
        colWidths: [20, 10, 50, 200]
    });

    for(let i = 0; cells[i]; i++) {
        let cell = cells[i];

        const anchor = cell.querySelector('.item-title');

        if (!anchor) {
            continue;
        }

        const title = anchor.childNodes[0].rawText;
        const link = anchor.getAttribute('href') as string;
        const parsed_url = url.parse(link, true);
        const item_id = parsed_url.query.Item ? parsed_url.query.Item : baseName(parsed_url.pathname as string);

        let inStock = false;
       if(cell.querySelector('.item-operate .item-button-area button.btn')) {
           inStock = true;
       }

        table.push([item_id, inStock, title, link]);

        if(inStock) {
            const toopen = link_base + item_id;
            console.log(title);
            console.log('Open:', toopen);
            const safeurl = toopen.replace('?', "\\?").replace('=', "\\=").replace("&", "\\&");
            console.log(safeurl);
            // childproc.exec(`open -a "Google Chrome" ${safeurl}`);
            return 30000;
        } 
    }

    console.log(table.toString());
    return 5000;

};

getStock().finally();
let timer = 5000;
setInterval(() => {
    console.log('loop start');
    getStock().then(result => timer);
}, timer);


