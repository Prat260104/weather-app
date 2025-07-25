// main.js

document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Replace with your actual OpenWeatherMap API key!
    const API_KEY = 'd18bc12db9fb8b3ab87e30bfdec0215a'; // Get this from OpenWeatherMap.org
    const BASE_URL = 'https://api.openweathermap.org/data/2.5/';

    // DOM Elements
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
    const uvIndexElem = document.getElementById('uv-index');
    const airQualityElem = document.getElementById('air-quality');

    const forecastSection = document.getElementById('forecast-section');
    const forecastCardsContainer = document.getElementById('forecast-cards');

    const previousSearchesSection = document.getElementById('previous-searches-section');
    const searchHistoryContainer = document.getElementById('search-history');

    const body = document.body;
    const weatherBackgroundOverlay = document.getElementById('weather-background-overlay');

    // --- Helper Functions ---

    function showLoading() {
        loadingSpinner.classList.remove('hidden');
        // Hide all main content sections and error messages
        weatherDisplay.classList.add('hidden');
        forecastSection.classList.add('hidden');
        errorMessage.classList.add('hidden');
        previousSearchesSection.classList.add('hidden'); // Hide history during load
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
        // Make sure previousSearchesSection is handled by loadSearchHistory for correct visibility
        weatherDisplay.classList.remove('hidden');
        weatherDisplay.classList.add('animate-fade-in'); // Add fade-in animation
        forecastSection.classList.remove('hidden');
        forecastSection.classList.add('animate-fade-in'); // Add fade-in animation
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('animate-pulse'); // Keep pulse on error
        // Ensure other sections are hidden and loading spinner is gone
        hideLoading(); // This will hide the spinner
        weatherDisplay.classList.add('hidden');
        forecastSection.classList.add('hidden');
        previousSearchesSection.classList.add('hidden');
    }

    function clearError() {
        errorMessage.classList.add('hidden');
        errorMessage.classList.remove('animate-pulse');
    }

    function getWeatherIconUrl(iconCode) {
        // OpenWeatherMap provides various icon sizes, @4x is large for current weather
        return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    }

    // Maps OpenWeatherMap main condition to a simpler string for background images and gradients
    function mapWeatherConditionToBackground(condition) {
        switch (condition.toLowerCase()) {
            case 'clear': return 'clear';
            case 'clouds': return 'clouds';
            case 'rain': return 'rain';
            case 'drizzle': return 'drizzle';
            case 'thunderstorm': return 'thunderstorm';
            case 'snow': return 'snow';
            case 'mist':
            case 'smoke':
            case 'haze':
            case 'dust':
            case 'fog':
            case 'sand':
            case 'ash':
            case 'squall':
            case 'tornado': return 'clouds'; // Group various atmospheric conditions under 'clouds' or a suitable generic if no specific image/gradient
            default: return 'default'; // Fallback to a generic default
        }
    }

    function formatDateTime(timestamp) {
        const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata' // Set time zone to Kanpur's time zone (IST)
        };
        return date.toLocaleString('en-US', options);
    }

    function getDayName(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    function getUVIndexCategory(uvIndex) {
        if (uvIndex <= 2) return { text: 'Low', colorClass: 'text-green-400' };
        if (uvIndex <= 5) return { text: 'Moderate', colorClass: 'text-yellow-400' };
        if (uvIndex <= 7) return { text: 'High', colorClass: 'text-orange-400' };
        if (uvIndex <= 10) return { text: 'Very High', colorClass: 'text-red-400' };
        return { text: 'Extreme', colorClass: 'text-purple-400' };
    }

    function getAirQualityCategory(aqi) {
        // AQI values from OpenWeatherMap Air Pollution API are 1-5
        if (aqi === 1) return { text: 'Good', colorClass: 'text-green-400' };
        if (aqi === 2) return { text: 'Fair', colorClass: 'text-yellow-400' };
        if (aqi === 3) return { text: 'Moderate', colorClass: 'text-orange-400' };
        if (aqi === 4) return { text: 'Poor', colorClass: 'text-red-400' };
        if (aqi === 5) return { text: 'Very Poor', colorClass: 'text-purple-400' };
        return { text: 'N/A', colorClass: 'text-gray-400' };
    }

    function setDynamicBackground(weatherCondition) {
        const mappedCondition = mapWeatherConditionToBackground(weatherCondition);
        const backgroundClass = `bg-gradient-${mappedCondition}`;

        // Remove any existing gradient classes before adding the new one
        const currentClasses = Array.from(body.classList);
        currentClasses.forEach(cls => {
            if (cls.startsWith('bg-gradient-')) {
                body.classList.remove(cls);
            }
        });
        body.classList.add(backgroundClass);

        // Set subtle background overlay image
        weatherBackgroundOverlay.style.backgroundImage = `url('public/img/${mappedCondition}.png')`;
        weatherBackgroundOverlay.style.backgroundSize = 'cover';
        weatherBackgroundOverlay.style.backgroundPosition = 'center';
        weatherBackgroundOverlay.style.opacity = '0.1'; // Very subtle overlay
    }


    // --- Fetching Data ---

    async function fetchWeatherData(city, lat = null, lon = null) {
        clearError();
        showLoading();

        let coordsLat, coordsLon;

        try {
            if (city) {
                // Step 1: Geocoding to get coordinates from city name
                const geoCodingUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
                const geoResponse = await fetch(geoCodingUrl);
                if (!geoResponse.ok) {
                    throw new Error('Could not get city coordinates. Network error or API issue.');
                }
                const geoData = await geoResponse.json();
                if (geoData.length === 0) {
                    throw new Error('City not found. Please check the spelling.');
                }
                coordsLat = geoData[0].lat;
                coordsLon = geoData[0].lon;
            } else if (lat !== null && lon !== null) {
                coordsLat = lat;
                coordsLon = lon;
            } else {
                throw new Error("Invalid input. Please provide a city name or coordinates.");
            }

            // Step 2: Fetch current weather, 5-day forecast, UV index, and Air Quality concurrently
            const weatherUrl = `${BASE_URL}weather?lat=${coordsLat}&lon=${coordsLon}&appid=${API_KEY}&units=metric`;
            const forecastUrl = `${BASE_URL}forecast?lat=${coordsLat}&lon=${coordsLon}&appid=${API_KEY}&units=metric`;
            const uvUrl = `${BASE_URL}uvi?lat=${coordsLat}&lon=${coordsLon}&appid=${API_KEY}`;
            const airQualityUrl = `${BASE_URL}air_pollution?lat=${coordsLat}&lon=${coordsLon}&appid=${API_KEY}`;


            const [weatherResponse, forecastResponse, uvResponse, airQualityResponse] = await Promise.allSettled([
                fetch(weatherUrl),
                fetch(forecastUrl),
                fetch(uvUrl),
                fetch(airQualityUrl)
            ]);

            // Process results, allowing some to fail without stopping the whole process
            let weatherData = null;
            if (weatherResponse.status === 'fulfilled' && weatherResponse.value.ok) {
                weatherData = await weatherResponse.value.json();
            } else {
                throw new Error('Failed to fetch current weather data.');
            }

            let forecastData = null;
            if (forecastResponse.status === 'fulfilled' && forecastResponse.value.ok) {
                forecastData = await forecastResponse.value.json();
            } else {
                 console.warn("Forecast data could not be fetched."); // Log but don't stop
            }

            let uvData = null;
            if (uvResponse.status === 'fulfilled' && uvResponse.value.ok) {
                uvData = await uvResponse.value.json();
            } else {
                console.warn("UV Index data could not be fetched."); // Log but don't stop
            }

            let airQualityData = null;
            if (airQualityResponse.status === 'fulfilled' && airQualityResponse.value.ok) {
                airQualityData = await airQualityResponse.value.json();
            } else {
                console.warn("Air Quality data could not be fetched."); // Log but don't stop
            }

            displayWeather(weatherData, uvData, airQualityData);
            if (forecastData) {
                displayForecast(forecastData);
            } else {
                forecastCardsContainer.innerHTML = '<p class="text-center text-gray-400 col-span-full">5-Day Forecast unavailable.</p>';
            }
            hideLoading();
            // Use the actual city name returned by the API for history if location was used
            addSearchToHistory(weatherData.name);

        } catch (error) {
            console.error("Error fetching weather data:", error);
            showError(error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            loadSearchHistory(); // Ensure history is always loaded/re-rendered after an attempt
        }
    }

    // --- Displaying Data ---

    function displayWeather(data, uvData, airQualityData) {
        const { name, sys, main, weather, wind, dt } = data;
        const weatherCondition = weather[0].main; // e.g., "Clear", "Clouds", "Rain"

        cityNameElem.textContent = `${name}, ${sys.country}`;
        dateTimeElem.textContent = formatDateTime(dt);
        weatherIconElem.src = getWeatherIconUrl(weather[0].icon);
        weatherIconElem.alt = weather[0].description;
        temperatureElem.querySelector('.temp-value').textContent = Math.round(main.temp);
        descriptionElem.textContent = weather[0].description;
        humidityElem.textContent = `${main.humidity}%`;
        windSpeedElem.textContent = `${(wind.speed * 3.6).toFixed(1)} km/h`; // Convert m/s to km/h

        // Update UV Index
        if (uvData && uvData.value !== undefined) {
            const uvCategory = getUVIndexCategory(uvData.value);
            uvIndexElem.innerHTML = `<span class="${uvCategory.colorClass}">${uvData.value}</span> (${uvCategory.text})`;
            uvIndexElem.classList.remove('text-gray-400'); // Remove default N/A color
        } else {
            uvIndexElem.textContent = 'N/A';
            uvIndexElem.className = 'detail-value text-gray-400'; // Reset class for N/A
        }

        // Update Air Quality
        if (airQualityData && airQualityData.list && airQualityData.list.length > 0) {
            const aqi = airQualityData.list[0].main.aqi; // AQI value (1-5)
            const aqiCategory = getAirQualityCategory(aqi);
            airQualityElem.innerHTML = `<span class="${aqiCategory.colorClass}">AQI ${aqi}</span> (${aqiCategory.text})`;
            airQualityElem.classList.remove('text-gray-400'); // Remove default N/A color
        } else {
            airQualityElem.textContent = 'N/A';
            airQualityElem.className = 'detail-value text-gray-400'; // Reset class for N/A
        }

        setDynamicBackground(weatherCondition);
        weatherDisplay.classList.remove('hidden');
        weatherDisplay.classList.add('animate-fade-in');
    }

    function displayForecast(data) {
        forecastCardsContainer.innerHTML = ''; // Clear previous forecast
        const forecastList = data.list;

        const dailyForecasts = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today

        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateString = date.toLocaleDateString(); // "MM/DD/YYYY"
            const hour = date.getHours();

            // Logic to pick one entry per day for the next 5 days
            // Prefer entries around noon (12-15h) for a representative daily forecast
            // Also ensure it's for a future day, not today
            if (date.getTime() > today.getTime() && (dailyForecasts[dateString] === undefined || (hour >= 12 && hour <= 15))) {
                dailyForecasts[dateString] = item;
            }
        });

        // Convert to array, sort by timestamp, and take up to 5 days
        const sortedDailyForecasts = Object.values(dailyForecasts).sort((a,b) => a.dt - b.dt).slice(0, 5);

        if (sortedDailyForecasts.length === 0) {
            forecastCardsContainer.innerHTML = '<p class="text-center text-gray-400 col-span-full">No 5-Day forecast data available.</p>';
            return;
        }

        sortedDailyForecasts.forEach(item => {
            const dayName = getDayName(item.dt);
            // Use the standard OpenWeatherMap icon for forecast (might be smaller than @4x for current)
            const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
            const temp = Math.round(item.main.temp);
            const description = item.weather[0].description;

            const cardHtml = `
                <div class="forecast-card">
                    <p class="forecast-day">${dayName}</p>
                    <img src="${icon}" alt="${description}" class="forecast-icon">
                    <p class="forecast-temp">${temp}<sup class="temp-unit">&deg;C</sup></p>
                    <p class="forecast-description">${description}</p>
                    <div class="forecast-details">
                         <i class="fas fa-tint"></i> ${item.main.humidity}%
                         <i class="fas fa-wind"></i> ${(item.wind.speed * 3.6).toFixed(1)}km/h
                    </div>
                </div>
            `;
            forecastCardsContainer.insertAdjacentHTML('beforeend', cardHtml);
        });
        forecastSection.classList.remove('hidden');
        forecastSection.classList.add('animate-fade-in');
    }

    // --- Search History ---

    function loadSearchHistory() {
        const history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
        searchHistoryContainer.innerHTML = '';
        if (history.length === 0) {
            previousSearchesSection.classList.add('hidden');
            return;
        }
        previousSearchesSection.classList.remove('hidden');
        previousSearchesSection.classList.add('animate-fade-in');

        history.forEach(city => {
            const historyItem = document.createElement('div');
            historyItem.className = 'search-history-item';
            historyItem.innerHTML = `
                <span class="history-city-name">${city}</span>
                <button class="delete-history-item" data-city="${city}" title="Remove from history">
                    <i class="fas fa-times"></i>
                </button>
            `;
            historyItem.addEventListener('click', (event) => {
                // Only trigger search if the delete button itself wasn't clicked
                if (!event.target.closest('.delete-history-item')) {
                    cityInput.value = city;
                    fetchWeatherData(city);
                }
            });
            searchHistoryContainer.appendChild(historyItem);
        });

        // Attach event listeners for delete buttons
        document.querySelectorAll('.delete-history-item').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the parent div's click event (which fetches weather)
                const cityToDelete = event.currentTarget.dataset.city;
                removeSearchFromHistory(cityToDelete);
            });
        });
    }

    function addSearchToHistory(city) {
        let history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
        city = city.trim();
        // Remove existing entry (case-insensitive) to prevent duplicates and move to top
        history = history.filter(item => item.toLowerCase() !== city.toLowerCase());

        history.unshift(city); // Add to the beginning
        if (history.length > 5) { // Keep only last 5 unique searches
            history = history.slice(0, 5);
        }
        localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
        loadSearchHistory(); // Re-render history to reflect changes
    }

    function removeSearchFromHistory(cityToRemove) {
        let history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
        history = history.filter(city => city.toLowerCase() !== cityToRemove.toLowerCase()); // Case-insensitive delete
        localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
        loadSearchHistory(); // Re-render history
    }

    // --- Event Listeners ---

    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeatherData(city);
        } else {
            showError("Please enter a city name.");
        }
    });

    cityInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchBtn.click();
        }
    });

    locationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            showLoading();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchWeatherData(null, latitude, longitude);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    let userMessage = "Unable to retrieve your location. Please allow location access or search manually.";
                    if (error.code === error.PERMISSION_DENIED) {
                        userMessage = "Location access denied by user. Please enable it in your browser settings or search manually.";
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        userMessage = "Location information is unavailable. Try again later or search manually.";
                    } else if (error.code === error.TIMEOUT) {
                        userMessage = "Request to get user location timed out. Try again.";
                    }
                    showError(userMessage);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Geolocation options for better accuracy
            );
        } else {
            showError("Geolocation is not supported by your browser.");
        }
    });

    // Initial load: Fetch weather for a default city or current location
    const defaultCity = 'Kanpur'; // Given your context

    // Try to get current location first, fallback to default city if permission is denied or not supported
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherData(null, latitude, longitude);
            },
            (error) => {
                console.warn("Geolocation denied or error, falling back to default city:", error);
                fetchWeatherData(defaultCity);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Geolocation options
        );
    } else {
        fetchWeatherData(defaultCity);
    }

    // Load search history on page load
    loadSearchHistory();
});
