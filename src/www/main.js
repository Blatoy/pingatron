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
        if (isNaN(value) || !isFinite(value) || value === null) {
            element.textContent = "999";
        } else {
            element.textContent = Math.round(value);
        }
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
    hideIfMissing: (value, element) => {
        element.classList.toggle("hidden", !value);
    }
};

const arrayElements = document.querySelectorAll("[data-api-array]");
const dynamicElements = document.querySelectorAll("[data-api]");

const APIPathToElements = {};
const APIPathToArrays = {};

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

// Map array API paths to their containers and templates
arrayElements.forEach((container) => {
    const apiPath = container.dataset.apiArray;

    if (!(apiPath in APIPathToArrays)) {
        APIPathToArrays[apiPath] = [];
    }

    APIPathToArrays[apiPath].push({
        container,
        template: container.innerHTML,
    });
});

async function fetchData(api) {
    const result = await fetch(api.url);
    const data = await result.json();

    const basePath = api.name + "/";
    const apiPaths = objectToApiPath(data, basePath);

    for (const apiPath in apiPaths) {
        const value = apiPaths[apiPath];

        // Handle regular elements
        const elements = APIPathToElements[apiPath];

        if (elements) {
            elements.forEach(({ element, transformer }) => {
                transformer(value, element);
            });
        }

        // Handle arrays
        const arrays = APIPathToArrays[apiPath];

        if (arrays) {
            arrays.forEach(({ container, template }) => {
                container.innerHTML = "";

                if (!Array.isArray(value)) {
                    console.warn(`Expected an array for API path ${apiPath}`);
                    return;
                }

                value.forEach((item) => {
                    const wrapper = document.createElement("div");
                    wrapper.innerHTML = template;

                    const clone = wrapper.firstElementChild;

                    // Populate all array keys
                    clone.querySelectorAll("[data-array-key]").forEach((element) => {
                        const key = element.dataset.arrayKey;
                        const transformerName = element.dataset.transformer || "default";
                        const transformer = transformers[transformerName];

                        if (!transformer) {
                            console.warn(`Transformer ${transformerName} not found for array key ${key}`);
                            return;
                        }

                        transformer(item[key], element);
                    });

                    // Also handle a data-array-key on the root element
                    if (clone.matches("[data-array-key]")) {
                        const key = clone.dataset.arrayKey;
                        const transformerName = clone.dataset.transformer || "default";
                        const transformer = transformers[transformerName];

                        if (transformer) {
                            transformer(item[key], clone);
                        }
                    }

                    container.appendChild(clone);
                });
            });
        }

        if (!elements && !arrays) {
            console.warn(`No elements found for API path ${apiPath}`);
        }
    }
}

// Convert ({a: {b: 1}, "basePath") to { "basePath/a.b": 1}}
function objectToApiPath(data, path = "", separator = "", result = {}) {
    for (const key in data) {
        const value = data[key];
        if (value !== null && Array.isArray(value)) {
            result[path ? `${path}${separator}${key}` : key] = value;
        }
        else if (typeof value === "object" && value !== null) {
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
