const conn = require("../db/conn");
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const countries = [
  { value: 'si', label: 'Singapur' },
  { value: 'in', label: 'India' },
];
const cities = [
  { countryCode: 'si', label: 'Singapur', value: 'singapur' },
  { countryCode: 'in', label: 'Mumbai', value: 'mumbai' },
];
exports.countries = async (req, res) => {
  res.status(200).json({
    countries,
    status: "true",
  });
};

exports.cities = async (req, res) => {
  res.status(200).json({
    cities,
    status: "true",
  });
};

exports.addPackages = async (req, res) => {
  const uuid = uuidv4();
  const {
    title,
    country,
    city,
    rate_validity,
    attractions,
    restaurants,
    min_passenger,
    max_passenger,
    guide,
  } = req.body;

  conn.query(
    'INSERT INTO packages (uuid, user_id, title, country, city, rate_validity, attractions, restaurants, min_passenger, max_passenger, guide) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uuid, req.user_id, title, country, city, rate_validity, attractions, restaurants, min_passenger, max_passenger, guide]
    , (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message, error: 'Internal Server Error' });
      }
      res.status(201).json({ packageId: results.insertId, message: 'Package added successfully!' });
    });
  // try {
  //   const result =  await conn.query(
  //     'INSERT INTO packages (uuid, user_id, title, country, city, rate_validity, attractions, restaurants, min_passenger, max_passenger, guide) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  //     [uuid, req.user_id, title, country, city, rate_validity, attractions, restaurants, min_passenger, max_passenger, guide]
  //   );
  //   console.log(result.insertId,'insertId')
  //   res.status(201).json({  message: "Package added successfully" });
  // } catch (error) {
  //   console.error(error);
  //   res.status(500).json({ error: 'Internal Server Error' });
  // }
};

exports.searchPackages = async (req, res) => {
  try {
    const userId = req.user_id;
    let { country, package, guide, transport, budgetHotel, airportPickup, airportDrop, passengers, packageCount } = req.body;
    passengers = JSON.parse(passengers);
    let attractions = `SELECT * FROM attractions`;
    const attractionsData = await new Promise((resolve, reject) => {
      conn.query(attractions, (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
    let sql = `SELECT * FROM packages WHERE user_id = ?`;
    let params = [userId];
    if (country) {
      sql += ` AND country = ?`;
      params.push(country);
    }
    if (package) {
      sql += ` AND title = ?`;
      params.push(package);
    }

    conn.query(sql, params, (err, results) => {
      if (err) throw err;
      if(results) {
        let servicePricing = `SELECT * FROM service_pricing WHERE user_id = ?`;
        conn.query(servicePricing, params, async(err, servicePricingResults) => {
          if (err) throw err;
          if(servicePricingResults) {
            const updatedResults = await Promise.all(results.map(async(element) => {
              var amount = 0;
              var amountDetails = {};
              var tickets = false
              var seaters = null;
              var allServiceData = servicePricingResults;
              var passengersCount = 0
              if(passengers && (passengers?.adults > 0 || passengers?.children > 0 || passengers?.rooms > 0)) {
                passengersCount = passengers.adults+ passengers.children
              }
              console.log(passengers,'passengers',passengersCount)
              if(guide && guide == 'guide') {
                var filterGuide = allServiceData.filter(el => el.service == guide)
                if(filterGuide && filterGuide.length > 0) {
                  amount += filterGuide[0].amount
                  // console.log(filterGuide[0].amount, '<------filterGuide', amount)
                  amountDetails.guide = filterGuide[0].amount
                }
              }
              if(budgetHotel && passengers && passengers.rooms) {
                var filterHotel = allServiceData.filter(el => el.service == 'hotel' && el.type == budgetHotel)
                if(filterHotel && filterHotel.length > 0) {
                    amount += filterHotel[0].amount * packageCount * passengers.rooms
                    amountDetails.hotel = filterHotel[0].amount*packageCount* passengers.rooms
                    // console.log(filterHotel[0].amount*packageCount* passengers.rooms, '<------filterHotel', amount)
                }
              }
              if(airportPickup && airportPickup == 'airport_pickup' && passengersCount) {
                var filterPickup = allServiceData.filter(el => el.service == 'transport' && el.type =='airport_pickup' && el.subtype_value >= passengersCount).sort((a, b) => parseInt(a.subtype_value )- parseInt(b.subtype_value))
                if(filterPickup && filterPickup.length > 0) {
                  amount += filterPickup[0].amount
                  amountDetails.pickup = filterPickup[0].amount
                  // console.log(filterPickup[0].amount , '<----filterPickup', amount)
                }
              }
              if(airportDrop && airportDrop == 'airport_dropoff' && passengersCount) {
                var filterDrop = allServiceData.filter(el => el.service == 'transport' && el.type == airportDrop && el.subtype_value >= passengersCount).sort((a, b) => parseInt(a.subtype_value )- parseInt(b.subtype_value))
                if(filterDrop && filterDrop.length > 0) {
                  amount += filterDrop[0].amount
                  amountDetails.drop = filterDrop[0].amount
                  // console.log(filterDrop[0].amount , '<----filterDrop', amount)
                }
              }
              if(transport && transport == 'transport' && passengersCount) {
                var filterTransport = allServiceData.filter(el => el.service == transport && el.type =='disposable' && el.subtype_value >= passengersCount).sort((a, b) => parseInt(a.subtype_value )- parseInt(b.subtype_value))
                if(filterTransport && filterTransport.length > 0) {
                  amount += filterTransport[0].amount * packageCount
                  seaters = filterTransport[0].subtype_value
                  amountDetails.transport = {amount:filterTransport[0].amount * packageCount,seaters}
                  // console.log(filterTransport[0].amount * packageCount, '<----filterTransport', amount, filterTransport)
                }
              }
              if(element.restaurants && passengersCount) {
                const restaurants = JSON.parse(element.restaurants)
                let lunchAmount = 0
                let dinnerAmount = 0
                restaurants.forEach(async(restaurant,index) => {
                  if(restaurant[`day_${index+1}`].lunch) {
                    var filterRestaurant = allServiceData.filter(el => el.service == 'restaurant' && el.subtype_value && parseInt(el.subtype_value) == parseInt(restaurant[`day_${index+1}`].lunch) && el.subtype_category == 'restaurants_id')
                      if(filterRestaurant && filterRestaurant.length>0) {
                        const postscript = filterRestaurant[0].postscript
                        if(postscript) {
                          const jsonData = JSON.parse(postscript)
                          if(jsonData && jsonData.lunchPrice) {
                            amount += parseFloat(jsonData.lunchPrice) * passengersCount
                            lunchAmount += parseFloat(jsonData.lunchPrice) * passengersCount
                            // console.log(jsonData.lunchPrice*passengersCount, '<----lunchPrice', amount)
                          }
                        }
                      }
                  }
                  if(restaurant[`day_${index+1}`].dinner) {
                    var filterRestaurant = allServiceData.filter(el => el.service == 'restaurant' && el.subtype_value && parseInt(el.subtype_value) == parseInt(restaurant[`day_${index+1}`].dinner) && el.subtype_category == 'restaurants_id')
                      if(filterRestaurant && filterRestaurant.length>0) {
                        const postscript = filterRestaurant[0].postscript
                        if(postscript) {
                          const jsonData = JSON.parse(postscript)
                          if(jsonData && jsonData.dinnerPrice) {
                            amount += parseFloat(jsonData.dinnerPrice) * passengersCount
                            dinnerAmount += parseFloat(jsonData.dinnerPrice) * passengersCount
                            // console.log(jsonData.dinnerPrice*passengersCount, '<----dinnerPrice', amount)
                          }
                        }
                      }
                  }
                });
                amountDetails.lunchAmount = lunchAmount
                amountDetails.dinnerAmount = dinnerAmount
              }

              if(element.attractions && attractionsData && attractionsData.length>0 && passengersCount) {
                const jsonAttractions = JSON.parse(element.attractions)
                let adultsAttractionsAmount = 0
                let childrenAttractionsAmount = 0
                jsonAttractions.forEach((attraction,index) => {
                  if(attraction[`day_${index+1}`].length > 0) {
                   const dataAttractions = attractionsData.filter(item =>  attraction[`day_${index+1}`].includes(item.id))
                   if(dataAttractions.length>0) {
                    dataAttractions.forEach(dataAttraction => {
                      if(passengers.adults && dataAttraction.ticket_adult) {
                        amount += passengers.adults * dataAttraction.ticket_adult
                        adultsAttractionsAmount += passengers.adults * dataAttraction.ticket_adult
                        tickets = true
                        // console.log(passengers.adults * dataAttraction.ticket_adult , '<----ticket_adult', amount)
                      }
                      if(passengers.children && dataAttraction.ticket_children) {
                        amount += passengers.children * dataAttraction.ticket_children
                        childrenAttractionsAmount += passengers.children * dataAttraction.ticket_children
                        tickets = true
                        console.log( passengers.children * dataAttraction.ticket_children , '<----ticket_children', amount)
                      }
                    });
                   }
                  }
                })
                amountDetails.adultsAttractionsAmount = adultsAttractionsAmount
                amountDetails.childrenAttractionsAmount = childrenAttractionsAmount
              }
              let currency = '$'
              if(allServiceData.length>0) {
                currency = allServiceData[0].currency
              }
              console.log(allServiceData[0].currency,'servicePricingResults')
              return {...element, amount, passengers, transport, budgetHotel, seaters,tickets,guide, currency, amountDetails}
            }));
            res.status(200).json({
              packages: updatedResults,
              status: "true",
            });
          } else {
            res.status(200).json({
              packages: results,
              status: "true",
            });
          }
        });
      } else {
        res.status(200).json({
          packages: [],
          status: "true",
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "No packages available.",
      status: "false",
      error: error.message,
    });
  }
};
exports.getPackages = async (req, res) => {
  try {
    const userId = req.user_id;
    const { country, title } = req.query;

    let sql = `SELECT * FROM packages WHERE user_id = ?`;
    let params = [userId];
    if (country) {
      sql += ` AND country = ?`;
      params.push(country);
    }
    if (title) {
      sql += ` AND title = ?`;
      params.push(title);
    }

    conn.query(sql, params, (err, results) => {
      if (err) throw err;
      res.status(200).json({
        packages: results,
        status: "true",
      });
    });
  } catch (error) {
    res.status(500).json({
      message: "No packages available.",
      status: "false",
      error: error.message,
    });
  }
};

exports.sendQuote = async (req, res) => {
    const userId = req.user_id;
    const uuid = uuidv4();
    const { email, sendQuoteDetails, meals } = req.body;
  const item = JSON.parse(sendQuoteDetails)
    if (!email || !email.trim()) {
        return res.status(400).json({ error:'email address is required.'});
    }
    if(item) {

        let htmlContent = '<p>Details is not found</p>';
        if(item) {
          htmlContent = `
            <ul>
              <li>Package:- ${item.title.split('_').join(' ')}</li>
              <li>Rate Validity:- ${item.rate_validity}</li>
              <li>Passengers:- ${item.passengers.label}</li>
              <hr />
              <li>Hotel:- ${item.passengers.rooms} Rooms</li>
              <li>Tickets:- ${ item.tickets ? 'Yes' : 'No' }</li>
              <li>Main Meals:- ${meals} Meals</li>
              <li>Tour guide:-  ${item.guide && item.guide !='null' ?item.guide: '-'}</li>
              <li>Transport:-  ${ item.seaters ? item.seaters + '-seaters' : '-' }</li>
              <hr />
              <li>B2B rate:- ${ item.currency ?? '$ ' } ${item.amount ? item.amount : 0}</li>
              <li>Rate validity:- ${ item.rate_validity}</li>
            </ul>
          `;
    
          console.log(item);
          const amount = item.amount ?? 0
          const currency = item.currency ?? '$'
          const guide = item.guide == 'guide' ? 1:0
          const tickets = item.tickets ? 1 : 0
          const meal = parseInt(meals) > 0 ? 1 : 0
          const amountDetails = JSON.stringify(item.amountDetails) 
          conn.query(
            'INSERT INTO quotation (uuid, user_id, package_id, amount, currency, country, city, adults, children, hotel_choice, tour_guide_opted, tickets_opted, meal_opted, expires_at, postscript) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [uuid, req.user_id, item.id, amount, currency, item.country, item.city, item.passengers.adults, item.passengers.children, item.budgetHotel, guide, tickets, meal, item.rate_validity, amountDetails]
            , (err, results) => {
              if (err) {
                return res.status(500).json({ message: err.message, error: 'Internal Server Error' });
              }
              // res.status(201).json({ packageId: results.insertId, message: 'quotation added successfully!' });
            });
          }
        console.log(process.env.EMAIL_USER,'process.env.EMAIL_USER')
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        let mailOptions = {
          from: process.env.EMAIL_USER, 
          to: email, 
          subject: "Tourr Quote Mail",
          html: htmlContent
      };
      try {
          let info = await transporter.sendMail(mailOptions);
          res.status(200).json({ message:'Email sent successfully!'});
      } catch (err) {
          res.status(500).json({ error:'Failed to send email.'});
      }
    } else {
      return res.status(400).json({ error:'Package Details is not found'});
    }
};

exports.duplicate = async (req, res) => {
  try {
    const userId = req.user_id;
    const { id } = req.params;
    const uuid = uuidv4();
    const sql = `INSERT INTO packages (uuid, user_id, title, country, city, rate_validity, attractions, restaurants, min_passenger, max_passenger, guide)
               SELECT ?, ?, title, country, city, rate_validity, attractions, restaurants, min_passenger, max_passenger, guide
               FROM packages
               WHERE id = ?`;

    conn.query(sql, [uuid, userId, id], (err, result) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: `Record with ID ${id} duplicated successfully` });
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "No packages available.",
      status: "false",
      error: error.message,
    });
  }
};

exports.getPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `SELECT * FROM packages WHERE id = ?`;
    conn.query(sql, [id], (err, result) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        if (result.length > 0) {
          res.json({ package: result[0], message: `Package get successfully` });
        } else {
          res.status(500).json({
            message: "No packages available.",
            status: "false",
          });
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "No packages available.",
      status: "false",
      error: error.message,
    });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `DELETE FROM packages WHERE id = ?`;
    conn.query(sql, [id], (err, result) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: `Package deleted successfully` });
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "No packages available.",
      status: "false",
      error: error.message,
    });
  }
};

exports.editPackage = async (req, res) => {
  const {
    title,
    country,
    city,
    rate_validity,
    attractions,
    restaurants,
    min_passenger,
    max_passenger,
    guide,
  } = req.body;

  const { id } = req.params;

  try {
    const result = await conn.query(
      'UPDATE packages SET title=?, country=?, city=?, rate_validity=?, attractions=?, restaurants=?, min_passenger=?, max_passenger=?, guide=? WHERE id=? AND user_id=?',
      [title, country, city, rate_validity, attractions, restaurants, min_passenger, max_passenger, guide, id, req.user_id]
    );
    res.status(200).json({ packageId: id, message: "Package updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.attractions = async (req, res) => {
  try {
    conn.query("SELECT * FROM attractions", (err, results) => {
      if (err) throw err;
      res.status(200).json({
        results,
        status: "true",
      });
    });
  } catch (error) {
    res.status(500).json({
      message: "No attractions available.",
      status: "false",
      error: error.message,
    });
  }
};

exports.addProductDetails = async (req, res) => {
  try {
    const restaurants = await new Promise((resolve, reject) => {
      conn.query("SELECT * FROM restaurants", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
    const attractions = await new Promise((resolve, reject) => {
      conn.query("SELECT * FROM attractions", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });

    res.status(200).json({
      restaurants,
      attractions,
      countries,
      cities,
      status: "true",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving restaurants.",
      status: "false",
      error: error.message,
    });
  }
};

