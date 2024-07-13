const express = require('express');
const bodyParser = require('body-parser');
const conn = require('./mysql');
const cors = require('cors');

const app = express();



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());




let MAX_ROOMS = 0;

// Function to fetch max rooms available from the database and update MAX_ROOMS
function updateMaxRooms() {
    conn.query("SELECT COUNT(*) AS max_rooms FROM `rooms_hotel`", (err, results) => {
        if (err) {
            console.error('Error fetching max rooms:', err);
        } else {
            MAX_ROOMS = results[0].max_rooms;
        }
    });
}

// Function to fetch room names from the database
function getRoomNames(callback) {
    conn.query("SELECT `room_name` FROM `rooms_hotel`", (err, results) => {
        if (err) {
            callback(err, null);
        } else {
            const roomNames = results.map(room => room.room_name);
            callback(null, roomNames);
        }
    });
}

// Fetch room names with a promise for async/await
async function fetchRoomNamesFromDB() {
    try {
        const roomNames = await new Promise((resolve, reject) => {
            getRoomNames((err, roomNames) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(roomNames);
                }
            });
        });
        return roomNames;
    } catch (error) {
        console.error('Error fetching room names from database:', error);
        return [];
    }
}

// Function to fetch room price details
function getRoomPrice(roomName, callback) {
    const query = "SELECT `room_price`, `room_id`, `room_name`, `room_type`, `description`, `created_at`, `image1`, `image2`, `image3`, `image4` FROM `rooms_hotel` WHERE `room_name` = ?";
    conn.query(query, [roomName], (err, results) => {
        if (err) {
            console.error('Error fetching room price:', err);
            callback(err, null);
        } else {
            if (results.length === 0) {
                callback(null, []);
            } else {
                const room = results[0];
                const roomPrice = {
                    room_id: room.room_id,
                    room_name: room.room_name,
                    room_type: room.room_type,
                    room_price: room.room_price,
                    description: room.description,
                    created_at: room.created_at,
                    image1: room.image1 ? room.image1.toString('base64') : '',
                    image2: room.image2 ? room.image2.toString('base64') : '',
                    image3: room.image3 ? room.image3.toString('base64') : '',
                    image4: room.image4 ? room.image4.toString('base64') : ''
                };
                callback(null, roomPrice);
            }
        }
    });
}

// Function to check room availability
function checkRoomAvailability(date, callback) {
    conn.query("SELECT COUNT(*) AS total FROM `bookings` WHERE `check_in` <= ? AND `check_out` >= ?", [date, date], (err, results) => {
        if (err) {
            console.error('Error checking room availability:', err);
            callback(err, null);
        } else {
            const totalBookings = results[0].total;
            const availableRooms = MAX_ROOMS - totalBookings;
            callback(null, availableRooms);
        }
    });
}

// Endpoint to fetch room details by room_id
app.get('/roomDetails', (req, res) => {
    const { room_id } = req.query;
    const query = "SELECT `room_name`, `room_type`, `room_price`, `description`, `created_at`, `image1`, `image2`, `image3`, `image4` FROM `rooms_hotel` WHERE `room_id` = ?";
    conn.query(query, [room_id], (err, results) => {
        if (err) {
            console.error('Error fetching room details:', err);
            res.status(500).json({ error: 'Error fetching room details' });
        } else {
            if (results.length === 0) {
                res.status(404).json({ error: 'Room not found' });
            } else {
                const roomDetails = {
                    room_id: results[0].room_id,
                    room_name: results[0].room_name,
                    room_type: results[0].room_type,
                    room_price: results[0].room_price,
                    description: results[0].description,
                    created_at: results[0].created_at,
                    image1: results[0].image1 ? results[0].image1.toString('base64') : '',
                    image2: results[0].image2 ? results[0].image2.toString('base64') : '',
                    image3: results[0].image3 ? results[0].image3.toString('base64') : '',
                    image4: results[0].image4 ? results[0].image4.toString('base64') : ''
                };
                res.json(roomDetails);
            }
        }
    });
});

// Endpoint to fetch room availability by date
app.get('/roomAvailability', (req, res) => {
    const { date } = req.query;
    checkRoomAvailability(date, (err, availableRooms) => {
        if (err) {
            console.error('Error checking room availability:', err);
            res.status(500).json({ error: 'Error checking room availability' });
        } else {
            const response = availableRooms > 0 ? `We have ${availableRooms} rooms available for ${date}. You can proceed with your booking.` : "I apologize, but it seems that we are fully booked for the requested dates. Would you like me to check availability for alternative dates or assist you with any other inquiries?";
            res.json({ message: response });
        }
    });
});

// Endpoint to handle user information insertion
app.post('/user/info', (req, res) => {
    const { NameOfYour, MobileNumber, DOB, Email, MarriedStatus, SpousesName, SpousesDOB, AnniversaryDate, Child1, Child2, child3, child4, Child1DOB, Child2DOB, Child3DOB, Child4DOB, Address, City } = req.body;
    const query = "INSERT INTO user_data (NameOfYour, MobileNumber, DOB, Email, MarriedStatus, SpousesName, SpousesDOB, AnniversaryDate, Child1, Child2, child3, child4, Child1DOB, Child2DOB, Child3DOB, Child4DOB, Address, City) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    conn.query(query, [NameOfYour, MobileNumber, DOB, Email, MarriedStatus, SpousesName, SpousesDOB, AnniversaryDate, Child1, Child2, child3, child4, Child1DOB, Child2DOB, Child3DOB, Child4DOB, Address, City], (err, results) => {
        if (err) {
            console.error('Error inserting user data:', err);
            res.status(500).json({ error: 'Error inserting user data' });
        } else {
            res.json({ message: 'User data inserted successfully.' });
        }
    });
});

// Endpoint to fetch user details by email
app.get('/user/details', (req, res) => {
    const { Email } = req.query;
    const query = "SELECT * FROM user_data WHERE Email = ?";
    conn.query(query, [Email], (err, results) => {
        if (err) {
            console.error('Error fetching user data:', err);
            res.status(500).json({ error: 'Error fetching user data' });
        } else {
            if (results.length === 0) {
                res.status(404).json({ error: 'User data not found for the provided email.' });
            } else {
                res.json({ data: results, message: 'User data retrieved successfully.' });
            }
        }
    });
});

// Endpoint to fetch all users
app.get('/users', (req, res) => {
    const query = "SELECT * FROM user_data";
    conn.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            res.status(500).json({ error: 'Error fetching users' });
        } else {
            res.json({ Users: results });
        }
    });
});

// Route to handle chat messages
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(200).json({ error: "Welcome to Rambihari Palace. How may I assist you today?" });
    }

    if (message.toLowerCase().includes("price") || message.toLowerCase().includes("cost") || message.toLowerCase().includes("rent") ) {
        const roomNames = await fetchRoomNamesFromDB();
        const matchedRoomName = roomNames.find(roomName => new RegExp(`\\b${roomName}\\b`, 'i').test(message));

        if (matchedRoomName) {
            getRoomPrice(matchedRoomName, (err, roomPrices) => {
                if (err) {
                    console.error('Error fetching room price:', err);
                    return res.status(500).json({ error: 'Database error.' });
                }

                if (!Array.isArray(roomPrices)) {
                    roomPrices = [roomPrices]; // Ensure roomPrices is an array for consistency
                }
                // const prices = roomPrices.map(room => ` Room Name: ${room.room_name} Price: ${room.room_price}   Image1: ,${room.image1}" alt="Image 1" class=" object-cover rounded-lg mr-2 mb-2 grid"> Image2: <img src="data:image/png;base64,${room.image2}" alt="Image 4" class="w-32 h-32 object-cover rounded-lg mr-2 mb-2"> Image3: <img src="data:image/png;base64,${room.image3}" alt="Image 4" class="w-32 h-32 object-cover rounded-lg mr-2 mb-2"> Image4: <img src="data:image/png;base64,${room.image4}" alt="Image 4" class="w-32 h-32 object-cover rounded-lg mr-2 mb-2"> Room Type: ${room.room_type}`);

                const prices = roomPrices.map(room => `
                    <div class="grid grid-cols-2 gap-4"> 
                      <div class="flex flex-col">
                        <p>Room Name: ${room.room_name}</p>
                        <p>Price: ${room.room_price}</p>
                        <p>Room Type: ${room.room_type}</p>
                      </div>
                      <div class="grid lg:grid-cols-2 gap-4 md:grid-2">
                        <img src="data:image/png;base64,${room.image1}" alt="Image 1" class="object-cover rounded-lg mr-2 mb-2">
                        <img src="data:image/png;base64,${room.image2}" alt="Image 2" class="object-cover rounded-lg mr-2 mb-2">
                        <img src="data:image/png;base64,${room.image3}" alt="Image 3" class="object-cover rounded-lg mr-2 mb-2">
                        <img src="data:image/png;base64,${room.image4}" alt="Image 4" class="object-cover rounded-lg mr-2 mb-2">
                      </div>
                    </div>
                  `);
                const response = roomPrices.length > 0 ? `The prices for ${matchedRoomName} are: ${prices.join(', ')}` : `Sorry, the prices for ${matchedRoomName} are not available.`;
                res.json({ message: response });
            });

        } 

        // else {
            
        //     res.json({ message: `Please specify a valid room name for which you want to know the price. ` });
        // }

        else {
            const roomNames = await fetchRoomNamesFromDB();
            const roomLinks = `${roomNames.map(name => ` <b>${name}</b> `).join(', ')} |`;
            res.json({ 
                message: roomNames.length > 0 ? `Please specify a valid room name for which you want to know the price. Rooms: ${roomLinks} ` : `Please specify a valid room name for which you want to know the price. `,
            });
        }
        

    }   else if (message.toLowerCase().includes("availability") || message.toLowerCase().includes("available") || message.toLowerCase().includes("booking")) {
        const date = message.match(/\b\d{2}-\d{2}-\d{4}\b/i); 
        if (date) {
            const parts = date[0].split("-");
            const formattedDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
            
            checkRoomAvailability(formattedDate, (err, availableRooms) => {
                if (err) {
                    console.error('Error checking room availability:', err);
                    return res.status(500).json({ error: 'Database error.' });
                }
                const response = availableRooms > 0 ? `We have <b>${availableRooms}</b> rooms available for <b>${formattedDate}.</b> You can proceed with your booking.` : "I apologize, but it seems that we are fully booked for the requested dates. Would you like me to check availability for alternative dates or assist you with any other inquiries";
                res.json({ message: response });
            });
        } else {
            res.json({ message: "Please specify the date for which you want to check availability." });
        }} else{

            const roomNames = await fetchRoomNamesFromDB();
            const roomLinks = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${roomNames.map(name => `
                        <a class="px-4 py-2 mt-4 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:border-blue-300" href="http://localhost:${port}/${encodeURIComponent(name)}">${name}</a>
                    `).join('')}
                </div>
        `;


        const responses = {
            greeting: "Welcome to Rambihari Palace. How may I assist you today?",
            far:` Jaipur:-120, Gurugram :-125 , Alwar:-10 CP:- 165, Mathura:-120, Nimrana:-60, <a class="text-blue-400 hover:text-blue-800 underline" href="https://www.google.com/maps?q=Ram+Bihari+Palace,+Alwar" target="_blank"> Ram Bihari Palace, Alwar </a>`,
            location:`<a class="text-blue-400 hover:text-blue-800 underline" href="https://www.google.com/maps?q=Ram+Bihari+Palace,+Alwar" target="_blank"> Ram Bihari Palace, Alwar </a>`,
            typeofrooms: `Certainly! I'd be happy to assist you with that. Could you please provide me with the dates you're interested in and any specific room preferences you have? Rooms:- <br>${roomLinks}`,
            amenities: `AC, Geyser, Free Wifi, Power Backup, Pool, Garden, Sports Equipment `, 
            contactInfo: `You can contact us via email at <a class="text-blue-900" href='mailto:explore@testrj8.com'> explore@testrj8.com</a> 📩... <a href= 'tel:+919024414017'> 9024414017</a> 📲...`,// <a href= 'tel:+918000344848'> 8000344848</a> 📲...
            thankYou: "You're welcome! If you need any further assistance, feel free to ask.",
            default: "I'm sorry, I didn't understand that. Could you please repeat or ask something else?",
            event: ` <a class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring focus:border-blue-300" href='rambiharipelece_events'>Go to Events</a>`,
            allrooms: roomNames.length > 0 ? `Rooms: ${roomLinks}` : "Room names are not available at the moment. Please try again later."
        };

        let response;
        if (message.toLowerCase().includes("hello") || message.toLowerCase().includes("hi") || message.toLowerCase().includes("ha")) {
            response = responses.greeting;
        } else if (message.toLowerCase().includes("rooms") || message.toLowerCase().includes("availability") || message.toLowerCase().includes("rooms available") || message.toLowerCase().includes("want to book rooms") || message.toLowerCase().includes("hotel") || message.toLowerCase().includes("room")) {
            response = responses.typeofrooms;
        } else if (message.toLowerCase().includes("amenities") || message.toLowerCase().includes("facilities")) {
            response = responses.amenities;
        } else if (message.toLowerCase().includes("contact") || message.toLowerCase().includes("email") || message.toLowerCase().includes("connect")  || message.toLowerCase().includes("email") || message.toLowerCase().includes("connect") || message.toLowerCase().includes("contact") || message.toLowerCase().includes("telephone") || message.toLowerCase().includes("talk") || message.toLowerCase().includes("phone") ) {
            response = responses.contactInfo;
        } else if (message.toLowerCase().includes("all rooms") ||  message.toLowerCase().includes("name")  || message.toLowerCase().includes("total")) {
            response = responses.allrooms;
        } else if (message.toLowerCase().includes("thank you") || message.toLowerCase().includes("thanks") || message.toLowerCase().includes("ok") || message.toLowerCase().includes("bye")) {
            response = responses.thankYou;
        } else if (message.toLowerCase().includes("event") || message.toLowerCase().includes("function") || message.toLowerCase().includes("wedding") || message.toLowerCase().includes("marrige")  ) {
            response = responses.event;
        } else if (message.toLowerCase().includes("far") || message.toLowerCase().includes("distance")){
            response = responses.far;
        } else if (message.toLowerCase().includes("location") || message.toLowerCase().includes("approach") || message.toLowerCase().includes("reach") || message.toLowerCase().includes("visit") || message.toLowerCase().includes("ram bihari palace")) {
                response = responses.location;
            }
        else {
            response = responses.default;
        }
        
        res.json({ message: response });
    }
});



// Endpoint to get room names
app.get('/getRoomNames', async (req, res) => {
    try {
        const roomNames = await fetchRoomNamesFromDB();
        res.json({ roomNames });
    } catch (error) {
        console.error('Error fetching room names:', error);
        res.status(500).json({ error: 'Failed to fetch room names.' });
    }
});

// calendar function


// Server setup
const port = 8005;
app.listen(port, () => {
    console.log(`Correct chatbot for hotel with advanced dynamic features running at http://localhost:${port}/`);
});

updateMaxRooms();
setInterval(updateMaxRooms, 24 * 60 * 60 * 1000); // Update max rooms every 24 hours
