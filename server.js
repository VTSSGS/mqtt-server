require('dotenv').config();

const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');

const { createClient } =
require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());

// =====================================================
// SUPABASE
// =====================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// =====================================================
// MQTT CONNECT
// =====================================================

const mqttClient = mqtt.connect({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  protocol: 'mqtts',
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

// =====================================================
// MQTT CONNECTED
// =====================================================

mqttClient.on('connect', () => {

  console.log('================================');
  console.log('MQTT CONNECTED');
  console.log('================================');

  mqttClient.subscribe('relay/data/+');
  mqttClient.subscribe('relay/status/+');

  console.log('Subscribed relay/data/+');
  console.log('Subscribed relay/status/+');
});

// =====================================================
// MQTT RECEIVE
// =====================================================

mqttClient.on('message', async (
  topic,
  message
) => {

  try {

    const payload =
      JSON.parse(message.toString());

    console.log('--------------------------------');
    console.log('TOPIC:', topic);
    console.log('DATA:', payload);

    // ============================================
    // DEVICE SENSOR DATA
    // ============================================

    if(topic.startsWith('relay/data/')) {

      // relay/data/customer001

      const device_id =
        topic.split('/')[2];

      console.log('DEVICE ID:', device_id);

      // ==========================================
      // UPSERT LIVE TABLE
      // ==========================================

      const liveUpdate =
      await supabase
        .from('device_live')
        .upsert(
          {
            device_id: device_id,
            voltage: payload.voltage,
            current: payload.current,
            input_freq: payload.input_freq,
            output_freq: payload.output_freq,
            status: payload.status,
            updated_at: new Date()
          },
          {
            onConflict: 'device_id'
          }
        );

      if(liveUpdate.error) {

        console.log('DEVICE LIVE ERROR');
        console.log(liveUpdate.error);

      } else {

        console.log('DEVICE LIVE UPDATED');
      }

      // ==========================================
      // INSERT HISTORY TABLE
      // ==========================================

      const historyInsert =
      await supabase
        .from('device_data')
        .insert([
          {
            device_id: device_id,
            voltage: payload.voltage,
            current: payload.current,
            input_freq: payload.input_freq,
            output_freq: payload.output_freq,
            status: payload.status
          }
        ]);

      if(historyInsert.error) {

        console.log('DEVICE DATA ERROR');
        console.log(historyInsert.error);

      } else {

        console.log('DEVICE DATA INSERTED');
      }
    }

    // ============================================
    // STATUS DATA
    // ============================================

    if(topic.startsWith('relay/status/')) {

      console.log(
        'STATUS:',
        payload.mode
      );
    }

  } catch(err) {

    console.log('MESSAGE ERROR');
    console.log(err);
  }
});

// =====================================================
// RELAY CONTROL API
// =====================================================

app.post('/relay', (req, res) => {

  try {

    const device_id =
      req.body.device_id;

    const mode =
      req.body.mode;

    const topic =
      `relay/control/${device_id}`;

    const payload =
      JSON.stringify({ mode });

    mqttClient.publish(
      topic,
      payload
    );

    console.log('================================');
    console.log('RELAY SENT');
    console.log(topic);
    console.log(payload);
    console.log('================================');

    res.json({
      success: true
    });

  } catch(err) {

    console.log(err);

    res.status(500).json({
      success: false
    });
  }
});

// =====================================================
// TEST API
// =====================================================

app.get('/', (req, res) => {

  res.send('MQTT SERVER RUNNING');
});

// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log('================================');
  console.log(
    `SERVER RUNNING ON ${PORT}`
  );
  console.log('================================');
});