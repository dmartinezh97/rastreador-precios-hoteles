const { chromium } = require('playwright')
const axios = require('axios');

const HABITACION_NO_DISPONIBLE = "Habitación no disponible";
const HABITACION_DISPONIBLE = "{hotel} - {habitacion} ({checkInDate} - {checkOutDate}) - {precio}€";
const FILTRO_YEAR = 2022
const FILTRO_MES = [12]

const hoteles = [
    {
        nombre: 'Petit Mirador',
        url: 'https://direct-book.com/api/properties/petitmiradordirect/room-types/{habitacion}/availability?checkInsFrom={checkInDate}&checkInsTo={checkOutDate}&adults=2&children=0&infants=0&los=1',
        useApi: true,
        multipleDates: true,
        typeFormatDate: "yyyymmdd",
        habitaciones: [
            {
                id: "77491",
                tipo: 'Suite de luxe',
            },
            {
                id: "115430",
                tipo: 'Suite magic',
            }
        ],
        dataAvailable: (response) => {
            return response.result.length > 0
        },
        getMessageIsAdailableAndPrice: async (response, hotel, habitacion) => {
            const { result } = response
            if (result.length > 0) {
                let resultadosDisponibles = result.filter(x => x.totalAvailability > 0)
                resultadosDisponibles.forEach(informacion => {

                    let checkIn = new Date(informacion.date).toLocaleDateString();
                    let fechaInicial = new Date(informacion.date)
                    fechaInicial = fechaInicial.setDate(fechaInicial.getDate() + informacion.lengthOfStay)
                    let checkOut = new Date(fechaInicial).toLocaleDateString()

                    console.log("\x1b[32m", "Habitación disponible: ", "\x1b[0m", HABITACION_DISPONIBLE.format({
                        hotel: hotel,
                        habitacion: habitacion,
                        checkInDate: checkIn,
                        checkOutDate: checkOut,
                        precio: informacion.price
                    }))
                });
            } return false
        }
    },
    {
        nombre: 'Finca Prats - Junior Suite',
        url: 'https://fincaprats.com/index.php/es/reservar/hotel/1846?limit=10&limitstart=0&board=no&pack=&checkin={checkInDate}&checkout={checkOutDate}&rooms=1&adults%5B%5D=2',
        useApi: false,
        multipleDates: false,
        typeFormatDate: "yyyymmdd",
        habitaciones: [],
        dataAvailable: (response) => {
            return true
        },
        getMessageIsAdailableAndPrice: async ({ page }) => {
            await page.waitForSelector('#hotel-products-rooms tbody')

            const regex = new RegExp(/(\d+\.?\d*)/g);
            const content = await page.textContent('#amount-hotel-room-row-0-id-3252').catch(() => null);
            if(content != null && regex.test(content)){
                return content
            }else return HABITACION_NO_DISPONIBLE
        }
    }
]

    ; (async () => {
        const browser = await chromium.launch({ headless: true })

        const fechasAComprobar = getFinDeSemana(FILTRO_YEAR, FILTRO_MES)

        for (const hotel of hoteles) {
            const { nombre, url, habitaciones, useApi, multipleDates, typeFormatDate, dataAvailable, getMessageIsAdailableAndPrice } = hotel

            /* Si hay una API disponible y permite hacer filtrar entre dos fechas */
            if (useApi && multipleDates) {
                /* Si queremos mirar más de una habitación del mismo hotel aprovechamos los mismos datos del hotel, cambiando solo la información de la habitación */
                for (const habitacion of habitaciones) {
                    const { id, tipo } = habitacion

                    const urlFormatted = getUrlFormatted(url, typeFormatDate, fechasAComprobar[0], fechasAComprobar[fechasAComprobar.length - 1], id)
                    const response = await axios.get(urlFormatted)
                    if (dataAvailable(response.data)) {
                        getMessageIsAdailableAndPrice(response.data, nombre, tipo)
                    }
                }
            } else {
                for (const checkInDate of fechasAComprobar) {
                    try {
                        /* Establecemos las fechas a buscar */
                        const checkOutDate = new Date(checkInDate);
                        checkOutDate.setDate(checkOutDate.getDate() + 1);
                        /* Si tenemos API disponible, hacemos petición HTTP, de lo contrario scraping con chromium */
                        if (useApi && !multipleDates) {
                            /* Si queremos mirar más de una habitación del mismo hotel aprovechamos los mismos datos del hotel, cambiando solo la información de la habitación */
                            for (const habitacion of habitaciones) {
                                const { id, tipo } = habitacion
                                /* Mantenemos la constante url intacta para poder volver a formatear le url en la siguiente habitación */
                                const urlFormatted = getUrlFormatted(url, typeFormatDate, checkInDate, checkOutDate, habitacion.id)
                                const response = await axios.get(urlFormatted)
                                if (dataAvailable(response.data)) {
                                    getMessageIsAdailableAndPrice(response.data, nombre, tipo)
                                }
                            }
                        } else {
                            /* Abrimos una ventana nueva */
                            const page = await browser.newPage()
                            /* Formateamos la url */
                            await page.goto(getUrlFormatted(url, typeFormatDate, checkInDate, checkInDate, ""))
                            const precio = await getMessageIsAdailableAndPrice({ page })
                            console.log(`${nombre}: ${checkInDate} - ${precio}`)
                            page.close()
                        }
                    } catch (error) {
                        console.log(`No ha sido posible acceder al hotel: ${nombre} para la fecha: ${checkInDate}`)
                    }
                }
            }

        }

        await browser.close()
    })()

function getFinDeSemana(year, months) {
    const finesDeSemana = [];
    months.forEach(monthElement => {
        let month = monthElement - 1;
        let fecha = new Date(year, month, 1);
        while (fecha.getMonth() === month) {
            if ((fecha.getDay() === 5 || fecha.getDay() === 6) && fecha > new Date()) {
                finesDeSemana.push(new Date(fecha));
            }
            fecha.setDate(fecha.getDate() + 1);
        }
    });
    return finesDeSemana;
}

function getUrlFormatted(url, typeFormatDate, checkInDate, checkOutDate, habitacion) {
    checkInDate = getCorrectFormatDate(checkInDate, typeFormatDate)
    checkOutDate = getCorrectFormatDate(checkOutDate, typeFormatDate)

    return url.format({ habitacion: habitacion, checkInDate: checkInDate, checkOutDate: checkOutDate })
}

function getCorrectFormatDate(date, typeFormatDate) {
    if (typeFormatDate === "yyyymmdd") {
        return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
    }
}

String.prototype.formatDate = function () {
    var [day, month, year] = this.split('-');
    return `${year}/${month}/${day}`;
};

String.prototype.dateFormatt = function () {
    var [day, month, year] = this.split('/');
    return `${day}-${month}-${year}`;
};

String.prototype.format = function (placeholders) {
    var s = this;
    for (var propertyName in placeholders) {
        var re = new RegExp('{' + propertyName + '}', 'gm');
        s = s.replace(re, placeholders[propertyName]);
    }
    return s;
};