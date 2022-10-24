const { chromium } = require('playwright')

const HABITACION_NO_DISPONIBLE = "Habitación no disponible";

const hoteles = [
    {
        nombre: 'Petit Mirador - Suite de luxe',
        url: 'https://direct-book.com/properties/petitmiradordirect?locale=es&currency=EUR&checkInDate={checkInDate}&checkOutDate={checkOutDate}',
        checkPrecio: async ({ page }) => {
            await page.waitForSelector('.content-box .room-type')

            const content = await page.textContent('#roomType-77491 .room-rate-list span.price--now').catch(() => null);
            if(content != null && content.includes('EUR') === true){
                return content
            }else return HABITACION_NO_DISPONIBLE
        }
    },
    {
        nombre: 'Petit Mirador - Suite magic',
        url: 'https://direct-book.com/properties/petitmiradordirect?locale=es&currency=EUR&checkInDate={checkInDate}&checkOutDate={checkOutDate}',
        checkPrecio: async ({ page }) => {
            await page.waitForSelector('.content-box .room-type')

            const content = await page.textContent('#roomType-115430 .room-rate-list span.price--now').catch(() => null);
            if(content != null && content.includes('EUR') === true){
                return content
            }else return HABITACION_NO_DISPONIBLE
        }
    },
    {
        nombre: 'Finca Prats - Junior Suite',
        url: 'https://fincaprats.com/index.php/es/reservar/hotel/1846?limit=10&limitstart=0&board=no&pack=&checkin={checkInDate}&checkout={checkOutDate}&rooms=1&adults%5B%5D=2',
        checkPrecio: async ({ page }) => {
            await page.waitForSelector('#hotel-products-rooms tbody')

            const regex = new RegExp(/(\d+\.?\d*)/g);
            const content = await page.textContent('#amount-hotel-room-row-0-id-3252').catch(() => null);
            if(content != null && regex.test(content)){
                return content
            }else return HABITACION_NO_DISPONIBLE
        }
    }
]

;(async () => {
    const browser = await chromium.launch({ headless: true })

    for (const hotel of hoteles ) {
        const { nombre, url, checkPrecio } = hotel

        const page = await browser.newPage()
        try {
            await page.goto(url.format({ checkInDate: '11-12-2022', checkOutDate: '12-12-2022' }))
            //await page.goto(url.format({ checkInDate: '24-10-2022', checkOutDate: '25-10-2022' }))
            const precio = await checkPrecio({ page })
            console.log(`${nombre}: ${precio}`)
        } catch (error) {
            console.log(`No ha sido posible acceder al hotel: ${nombre}`)
        }
    }

    await browser.close()
    return true
})()


String.prototype.format = function(placeholders) {
    var s = this;
    for(var propertyName in placeholders) {
        var re = new RegExp('{' + propertyName + '}', 'gm');
        s = s.replace(re, placeholders[propertyName]);
    }    
    return s;
};