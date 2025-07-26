// Replace with your API key
document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = 'd18bc12db9fb8b3ab87e30bfdec0215a';
    const BASE_URL = 'https://api.openweathermap.org/data/2.5/';

    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const locationBtn = document.getElementById('location-btn');
    const errorMessage = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');

    const weatherDisplay = document.getElementById('weather-display');
    const cityNameElem = document.getElementById('city-name');
    const dateTimeElem = document.getElementById('date-time');
    const weatherIconElem = document.getElementById('weather-icon');
    const temperatureElem = document.getElementById('temperature');
    const descriptionElem = document.getElementById('description');
    const humidityElem = document.getElementById('humidity');
    const windSpeedElem = document.getElementById('wind-speed');

    const forecastSection = document.getElementById('forecast-section');
    const forecastCardsContainer = document.getElementById('forecast-cards');

    const previousSearchesSection = document.getElementById('previous-searches-section');
    const searchHistoryContainer = document.getElementById('search-history');

    const body = document.body;
    const weatherBackgroundOverlay = document.getElementById('weather-background-overlay');

    function showLoading() {
        loadingSpinner.classList.remove('hidden');
        weatherDisplay.classList.add('hidden');
        forecastSection.classList.add('hidden');
        errorMessage.classList.add('hidden');
        previousSearchesSection.classList.add('hidden');
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
        weatherDisplay.classList.remove('hidden');
        weatherDisplay.classList.add('animate-fade-in');
        forecastSection.classList.remove('hidden');
        forecastSection.classList.add('animate-fade-in');
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('animate-pulse');
        hideLoading();
        weatherDisplay.classList.add('hidden');
        forecastSection.classList.add('hidden');
        previousSearchesSection.classList.add('hidden');
    }

    function clearError() {
        errorMessage.classList.add('hidden');
        errorMessage.classList.remove('animate-pulse');
    }

    function getWeatherIconUrl(iconCode) {
        return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    }

    function mapWeatherConditionToBackground(condition) {
        switch (condition.toLowerCase()) {
            case 'clear': return 'clear';
            case 'clouds': return 'clouds';
            case 'rain': return 'rain';
            case 'drizzle': return 'drizzle';
            case 'thunderstorm': return 'thunderstorm';
            case 'snow': return 'snow';
            default: return 'default';
        }
    }

    function formatDateTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });
    }

    function getDayName(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    function setDynamicBackground(weatherCondition) {
        const mappedCondition = mapWeatherConditionToBackground(weatherCondition);
        const backgroundClass = `bg-gradient-${mappedCondition}`;

        Array.from(body.classList).forEach(cls => {
            if (cls.startsWith('bg-gradient-')) {
                body.classList.remove(cls);
            }
        });
        body.classList.add(backgroundClass);

        weatherBackgroundOverlay.style.backgroundImage = `url('public/img/${mappedCondition}.png')`;
        weatherBackgroundOverlay.style.backgroundSize = 'cover';
        weatherBackgroundOverlay.style.backgroundPosition = 'center';
        weatherBackgroundOverlay.style.opacity = '0.1';
    }

    async function fetchWeatherData(city, lat = null, lon = null) {
        clearError();
        showLoading();

        let coordsLat, coordsLon;

        try {
            if (city) {
                const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
                const geoRes = await fetch(geoUrl);
                const geoData = await geoRes.json();
                if (!geoRes.ok || geoData.length === 0) throw new Error('City not found.');
                coordsLat = geoData[0].lat;
                coordsLon = geoData[0].lon;
            } else if (lat && lon) {
                coordsLat = lat;
                coordsLon = lon;
            } else {
                throw new Error("Invalid location input.");
            }

            const weatherUrl = `${BASE_URL}weather?lat=${coordsLat}&lon=${coordsLon}&appid=${API_KEY}&units=metric`;
            const forecastUrl = `${BASE_URL}forecast?lat=${coordsLat}&lon=${coordsLon}&appid=${API_KEY}&units=metric`;

            const [weatherRes, forecastRes] = await Promise.all([
                fetch(weatherUrl),
                fetch(forecastUrl)
            ]);

            if (!weatherRes.ok) throw new Error('Weather data fetch failed.');
            const weatherData = await weatherRes.json();

            let forecastData = null;
            if (forecastRes.ok) forecastData = await forecastRes.json();

            displayWeather(weatherData);
            if (forecastData) displayForecast(forecastData);
            hideLoading();
            addSearchToHistory(weatherData.name);

        } catch (error) {
            console.error("Error:", error);
            showError(error.message || 'Error fetching data.');
        } finally {
            loadSearchHistory();
        }
    }

    function displayWeather(data) {
        const { name, sys, main, weather, wind, dt } = data;
        const condition = weather[0].main;

        cityNameElem.textContent = `${name}, ${sys.country}`;
        dateTimeElem.textContent = formatDateTime(dt);
        weatherIconElem.src = getWeatherIconUrl(weather[0].icon);
        weatherIconElem.alt = weather[0].description;
        temperatureElem.querySelector('.temp-value').textContent = Math.round(main.temp);
        descriptionElem.textContent = weather[0].description;
        humidityElem.textContent = `${main.humidity}%`;
        windSpeedElem.textContent = `${(wind.speed * 3.6).toFixed(1)} km/h`;

        setDynamicBackground(condition);
        weatherDisplay.classList.remove('hidden');
        weatherDisplay.classList.add('animate-fade-in');
    }

    function displayForecast(data) {
        forecastCardsContainer.innerHTML = '';
        const daily = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const key = date.toLocaleDateString();
            const hour = date.getHours();
            if (date > today && (!daily[key] || (hour >= 12 && hour <= 15))) {
                daily[key] = item;
            }
        });

        Object.values(daily).slice(0, 5).forEach(item => {
            const day = getDayName(item.dt);
            const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
            const temp = Math.round(item.main.temp);
            const desc = item.weather[0].description;

            forecastCardsContainer.insertAdjacentHTML('beforeend', `
                <div class="forecast-card">
                    <p class="forecast-day">${day}</p>
                    <img src="${icon}" alt="${desc}" class="forecast-icon">
                    <p class="forecast-temp">${temp}<sup class="temp-unit">&deg;C</sup></p>
                    <p class="forecast-description">${desc}</p>
                    <div class="forecast-details">
                        <i class="fas fa-tint"></i> ${item.main.humidity}%
                        <i class="fas fa-wind"></i> ${(item.wind.speed * 3.6).toFixed(1)}km/h
                    </div>
                </div>
            `);
        });

        forecastSection.classList.remove('hidden');
        forecastSection.classList.add('animate-fade-in');
    }

    function loadSearchHistory() {
        const history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
        searchHistoryContainer.innerHTML = '';
        if (!history.length) {
            previousSearchesSection.classList.add('hidden');
            return;
        }
        previousSearchesSection.classList.remove('hidden');
        previousSearchesSection.classList.add('animate-fade-in');

        history.forEach(city => {
            const item = document.createElement('div');
            item.className = 'search-history-item';
            item.innerHTML = `
                <span class="history-city-name">${city}</span>
                <button class="delete-history-item" data-city="${city}">
                    <i class="fas fa-times"></i>
                </button>`;
            item.addEventListener('click', e => {
                if (!e.target.closest('.delete-history-item')) {
                    cityInput.value = city;
                    fetchWeatherData(city);
                }
            });
            searchHistoryContainer.appendChild(item);
        });

        document.querySelectorAll('.delete-history-item').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const delCity = e.currentTarget.dataset.city;
                removeSearchFromHistory(delCity);
            });
        });
    }

    function addSearchToHistory(city) {
        let history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
        city = city.trim();
        history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
        history.unshift(city);
        if (history.length > 5) history = history.slice(0, 5);
        localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
        loadSearchHistory();
    }

    function removeSearchFromHistory(cityToRemove) {
        let history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
        history = history.filter(city => city.toLowerCase() !== cityToRemove.toLowerCase());
        localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
        loadSearchHistory();
    }

    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) fetchWeatherData(city);
        else showError("Please enter a city name.");
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    locationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            showLoading();
            navigator.geolocation.getCurrentPosition(
                pos => fetchWeatherData(null, pos.coords.latitude, pos.coords.longitude),
                err => {
                    console.error("Geolocation error:", err);
                    showError("Could not get location. Try searching manually.");
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            showError("Your browser does not support geolocation.");
        }
    });

    const defaultCity = 'Kanpur';
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => fetchWeatherData(null, pos.coords.latitude, pos.coords.longitude),
            () => fetchWeatherData(defaultCity),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        fetchWeatherData(defaultCity);
    }

    loadSearchHistory();
});
