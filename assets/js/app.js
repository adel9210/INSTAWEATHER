// Weather Controller 
const WeatherCtrl = (() => {
    let data = {
        list: {},
    };

    return {
        setData: (newData) => {
            data.list = newData;
        },
        getDataList: () => {
            return { ...data.list }
        }
    }
})();

// helpers controller 
const HelpersCtrl = (() => {

    return {
        _$: (selector) => {
            const ele = document.querySelectorAll(selector);
            return ele.length > 1 ? ele : ele[0];
        },
        on: (element, event, listener, capture) => {
            if (element) {
                if (element.addEventListener) {
                    element.addEventListener(event, listener, capture);
                } else if (element.attachEvent) {
                    element.attachEvent('on' + event, listener);
                }
            }
        },
        temperatureConverter: (value, type) => {
            let temperature;

            switch (type) {
                case 'C': // Convert to Celsius
                    temperature = (value - 32) / 1.8;
                    break;
                case 'F':
                    temperature = (value * 1.8) + 32;
                    break; // Convert to Fahrenheit
                default:
                    break
            }

            return temperature.toFixed(0);
        }
    }
})();

// UI controller 
const UICtrl = ((helpers) => {
    const DOMStrings = {
        currentCity: '.currently__city',
        currentDate: '.currently__date',
        currentStatus: '.currently__status',
        currentIcon: '.currently__icon',
        currentTemperature: '.currently__temperature',
        currentSummary: '.currently__today-summary',
        temperatureHigh: '.currently__today-high',
        temperatureLow: '.currently__today-low',
        loader: '.loader',
        hourlyTemperature: '.hourly-temperature',
        dailyTemperature: '.daily-temperature',
        navLink: '.weather-nav__link',
        navLinkActive: 'weather-nav__link--active',
        temperatureDegree: '.degree',
        buttonDailyHourly: '.button',
        switchButtonActive: 'button--active'
    }

    const $ = helpers._$;

    return {
        getDomStrings: () => {
            return { ...DOMStrings }
        },
        fillData: (data) => {
            const { time, temperature, summary, icon } = data.currently;
            const { temperatureHigh, temperatureLow } = data.daily.data[0]; // First day = today
            const dateOptions = { weekday: 'long', year: 'numeric', day: 'numeric' }


            // Currently 
            $(DOMStrings.currentCity).textContent = data.timezone;
            $(DOMStrings.currentDate).textContent = new Date(time * 1000).toLocaleDateString('usa', dateOptions);
            $(DOMStrings.currentStatus).textContent = summary;
            $(DOMStrings.currentTemperature).textContent = temperature.toFixed(0);
            $(DOMStrings.currentSummary).textContent = data.hourly.summary;
            $(DOMStrings.temperatureHigh).textContent = temperatureHigh.toFixed(0);
            $(DOMStrings.temperatureLow).textContent = temperatureLow.toFixed(0);

            // current icon 
            const currentIcon = icon.replace(/-/g, "_").toUpperCase();
            const skycons = new Skycons({ "color": "white" });
            skycons.play();
            skycons.set($(DOMStrings.currentIcon), Skycons[currentIcon]);

            // Hourly 
            const hourlyHtmlList = data.hourly.data.map((hour, index) => {
                return `
                <div class="temperature">
                    <h3 class="temperature__time">${new Date(hour.time * 1000).toLocaleTimeString().slice(0, 5)}</h3>
                    <canvas class="hourly-icon" data-currentIcon=${hour.icon} title=${hour.icon}  width="66" height="66"></canvas>
                    <h3 class="temperature__degree degree">${hour.temperature.toFixed(0)}</h3>
                </div>
                `;
            });
            $(DOMStrings.hourlyTemperature).innerHTML = hourlyHtmlList.slice(0, 24).join('');

            // Daily 
            const dailyHtmlList = data.daily.data.map((day, index) => {
                return `
                <div class="temperature">
                    <h3 class="temperature__time">${new Date(day.time * 1000).toString().split(' ')[0]}</h3>
                    <canvas class="daily-icon" data-currentIcon=${day.icon} title=${day.icon} width="66" height="66"></canvas>
                    <p>
                    <span class="degree temperature__degree">${day.temperatureHigh.toFixed(0)}</span> /
                    <span class="degree temperature__degree">${day.temperatureLow.toFixed(0)}</span>
                    </p>
                </div>
                `;
            });
            $(DOMStrings.dailyTemperature).innerHTML = dailyHtmlList.slice(0, 8).join('');

            [...$('.hourly-icon, .daily-icon')].forEach(icon => {
                const currentIcon = icon.dataset.currenticon.replace(/-/g, "_").toUpperCase();
                const skycons = new Skycons({ "color": "white" });
                skycons.play();
                skycons.set(icon, Skycons[currentIcon]);
            })


        },
        showLoader: () => {
            $(DOMStrings.loader).classList.add('show');
        },
        hideLoader: () => {
            $(DOMStrings.loader).classList.remove('show');
        }
    }
})(HelpersCtrl);


//App Controller 
const App = ((weather, UI, helpers) => {
    const DomStrings = UI.getDomStrings();
    const $ = helpers._$;
    const on = helpers.on;

    const initialize = () => {
        // Show loader 
        $(DomStrings.loader).classList.add('show');

        // check if browser suppert geolocation API
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                // Hide loader 
                $(DomStrings.loader).classList.remove('show');

                // Long & Lat
                const { longitude, latitude } = position.coords;

                // FETCH DATA   
                fetchData(latitude, longitude);

            }, err => {
                alert(err.message);

                // Hide loader 
                $(DomStrings.loader).classList.remove('show');
            })
        }
    }

    const setupEventsListener = () => {
        // Toggle Temperature Mode
        const toggleTemperatureDegree = (button, e) => {

            // Change temperature mode 
            const mode = button.dataset.mode;

            // to disable function if user hit the already active   
            if (!button.classList.contains(DomStrings.navLinkActive)) {
                [...$(DomStrings.temperatureDegree)].forEach((element) => {
                    element.textContent = helpers.temperatureConverter(element.textContent, mode);
                });
            }

            // Remove class active
            [...$(DomStrings.navLink)].forEach(element => {
                element.classList.remove(DomStrings.navLinkActive);
            });

            // Add active class 
            button.classList.add(DomStrings.navLinkActive);


            e.preventDefault();
        }

        // Toggle temperature mode (daily, hourly)
        const toggleTemperatureMode = (button, e) => {
            // Remove class active
            [...$(DomStrings.buttonDailyHourly)].forEach(button => {
                button.classList.remove(DomStrings.switchButtonActive);
            });

            // Add active class 
            button.classList.add(DomStrings.switchButtonActive);

            // Change temperature mode (daily, hourly)
            const mode = button.dataset.currentmode;
            switch (mode) {
                case 'daily':
                    $(DomStrings.dailyTemperature).style.display = 'flex';
                    $(DomStrings.hourlyTemperature).style.display = 'none';
                    break;
                case 'hourly':
                    $(DomStrings.hourlyTemperature).style.display = 'flex';
                    $(DomStrings.dailyTemperature).style.display = 'none';
                    break;
                default:
                    break;
            }


            e.preventDefault();
        }

        [...$(DomStrings.navLink)].forEach(button => {
            on(button, 'click', toggleTemperatureDegree.bind(this, button));
        });

        [...$(DomStrings.buttonDailyHourly)].forEach(button => {
            on(button, 'click', toggleTemperatureMode.bind(this, button));
        });


    }


    const fetchData = (lat, long) => {
        // Show loader 
        UI.showLoader();

        const proxy = 'https://cors-anywhere.herokuapp.com/';
        // Test purpose -- https://www.latlong.net/
        /* 
        Russia Location
        lat = 61.524010;
        long = 105.318756;

        France Location 
        lat = 46.227638;
        long = 2.213749;
        */
        fetch(`${proxy}https://api.darksky.net/forecast/a177f8481c31fa96c3f95ad4f4f84610/${lat},${long}`)
            .then(response => {
                return response.json();
            })
            .then(data => {
                if (!data.longitude) {
                    return;
                }

                // Setup events
                setupEventsListener();

                // SET DATA 
                weather.setData({ ...data });

                // UI FILL DATA
                UI.fillData({ ...data });

                // Hide loader 
                UI.hideLoader()

            }).finally(() => {
                // Hide loader 
                UI.hideLoader()
            })
    }

    return {
        init: initialize
    }
})(WeatherCtrl, UICtrl, HelpersCtrl);


// Run the app
App.init();