const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Speaker Booking API",
            version: "1.0.0",
            description: "API documentation for Speaker Booking System",
            contact: {
                name: "Avinash",
                email: "avinash.alt7@gmail.com",
            },
        },
        servers: [
            {
                url: "http://localhost:3005",
                description: "Development Server",
            },
        ],
    },
    apis: ["./index.js"], // Path to the file where routes are defined
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
module.exports = swaggerDocs;
