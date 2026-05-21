const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db('pethaven');
    const petCollection = db.collection('pets');
    const adoptionCollection = db.collection('adopt');

    // Get Pets Collection
    app.get('/all-pets', async (req, res) => {
      const search = req.query.search || '';
      const species = req.query.species || '';
      const sort = req.query.sort || '';

      const query = {};

      // Search by pet name
      if (search) {
        query.petName = {
          $regex: search,
          $options: 'i',
        };
      }

      // Filter by species
      if (species) {
        query.species = {
          $in: [species],
        };
      }

      // Sort options
      let sortOption = {};

      if (sort === 'low') {
        sortOption = {
          adoptionFee: 1,
        };
      }

      if (sort === 'high') {
        sortOption = {
          adoptionFee: -1,
        };
      }

      if (sort === 'newest') {
        sortOption = {
          createdAt: -1,
        };
      }

      const result = await petCollection.find(query).sort(sortOption).toArray();

      res.send(result);
    });

    // Get Single Pet
    app.get('/all-pets/:id', async (req, res) => {
      const { id } = req.params;
      const result = await petCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Post Pet
    app.post('/all-pets', async (req, res) => {
      const petData = req.body;
      const result = await petCollection.insertOne(petData);
      res.send(result);
    });

    // Post Pet Adopt collection
    app.post('/adopt-request', async (req, res) => {
      try {
        const adoptData = req.body;

        // validation
        if (!adoptData?.petId || !adoptData?.requesterEmail) {
          return res.status(400).send({
            success: false,
            message: 'Invalid request data',
          });
        }

        const existing = await adoptionCollection.findOne({
          petId: adoptData.petId,
          requesterEmail: adoptData.requesterEmail,
        });

        if (existing) {
          return res.send({
            success: false,
            message: 'Already requested',
          });
        }

        const result = await adoptionCollection.insertOne({
          ...adoptData,
          status: 'pending',
          createdAt: new Date(),
        });

        res.send({
          success: true,
          message: 'Adoption request created',
          result,
        });
      } catch (error) {
        res.status(500).send({ success: false, error });
      }
    });

    // Get Adopt requst
    app.get('/my-requests', async (req, res) => {
      const email = req.query.email;

      const result = await adoptionCollection
        .find({ requesterEmail: email })
        .toArray();

      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})