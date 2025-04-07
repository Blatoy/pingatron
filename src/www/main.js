// This is probably slightly overengineered to just avoid
// using many document.getElementById, woops
// On the bright side it makes it easier to add new stuff on the page without having to add a ton of lines here

const API_BASE_URL = "./api";

// API endpoints that will be polled
const APIs = [
    {
        name: "weather",
        refreshRate: 60000,
        url: `${API_BASE_URL}/weather`,
    },
    {
        name: "ping",
        refreshRate: 1000,
        url: `${API_BASE_URL}/ping`,
    },
];

// Functions to format data from the API
const transformers = {
    default: (value, element) => {
        element.textContent = value;
    },
    round: (value, element) => {
        element.textContent = Math.round(value);
    },
    secondsToMinutes: (value, element) => {
        element.textContent = Math.floor(value / 60);
    },
    classFromStatus: (value, element) => {
        element.classList.toggle("ok", value === 0);
        element.classList.toggle("warning", value === 1);
        element.classList.toggle("error", value === 2);
    },
    dayNight: (value, element) => {
        element.textContent = value ? "☀️" : "🌙";
    },
    isoDateToTime: (value, element) => {
        const date = new Date(Date.parse(value) - new Date().getTimezoneOffset() * 60 * 1000);
        element.innerText = date.toLocaleTimeString();
    },
};

const dynamicElements = document.querySelectorAll("[data-api]");
const APIPathToElements = {};

// Map an API path to the corresponding elements and their transformers
dynamicElements.forEach((element) => {
    const apiPath = element.dataset.api;
    const transformer = element.dataset.transformer || "default";

    if (transformers[transformer]) {
        if (!(apiPath in APIPathToElements)) {
            APIPathToElements[apiPath] = [];
        }

        APIPathToElements[apiPath].push({
            element,
            transformer: transformers[transformer],
        });
    } else {
        console.warn(`Transformer ${transformer} not found for element with ID ${element.id}`);
    }
});

async function fetchData(api) {
    const result = await fetch(api.url);
    const data = await result.json();

    const basePath = api.name + "/";
    const apiPaths = objectToApiPath(data, basePath);

    for (const apiPath in apiPaths) {
        const elements = APIPathToElements[apiPath];
        if (elements) {
            elements.forEach(({ element, transformer }) => {
                const value = apiPaths[apiPath];
                transformer(value, element);
            });
        } else {
            console.warn(`No elements found for API path ${apiPath}`);
        }
    }
}

// Convert ({a: {b: 1}, "basePath") to { "basePath/a.b": 1}}
function objectToApiPath(data, path = "", separator = "", result = {}) {
    for (const key in data) {
        const value = data[key];
        if (typeof value === "object" && value !== null) {
            objectToApiPath(value, path ? `${path}${separator}${key}` : key, ".", result);
        } else {
            result[path ? `${path}${separator}${key}` : key] = value;
        }
    }

    return result;
}

for (const API of APIs) {
    fetchData(API);

    setInterval(() => {
        fetchData(API);
    }, API.refreshRate);
}
