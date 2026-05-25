const express = require("express");
const mqtt = require("mqtt");
const cors = require("cors");

const { createClient } =
require("@supabase/supabase-js");

const app = express();

app.use(cors());

app.use(express.json());

// =====================================================
// SUPABASE
// =====================================================

const supabaseUrl =
"YOUR_SUPABASE_URL";

const supabaseKey =
"YOUR_SUPABASE_ANON_KEY";

const supabase =
createClient(
  supabaseUrl,
  supabaseKey
);

// =====================================================
// MQTT
// =====================================================

const MQTT_HOST =
"ef8062854f4046e2ab431515a833df52.s1.eu.hivemq.cloud";

const mqttClient =
mqtt.connect(
`mqtts://${MQTT_HOST}:8883`,
{
  username: "mainserver",
  password: "mainpassword",
}
);

// =====================================================
// MQTT CONNECT
// =====================================================

mqttClient.on("connect", () => {

  console.log(
    "MQTT CONNECTED"
  );

  mqttClient.subscribe(
    "relay/data/+"
  );

  mqttClient.subscribe(
    "relay/status/+"
  );
});

// =====================================================
// MQTT RECEIVE
// =====================================================

mqttClient.on(
"message",
async(topic, message) => {

  try {

    const msg =
    JSON.parse(
      message.toString()
    );

    console.log(
      topic,
      msg
    );

    const parts =
    topic.split("/");

    const type =
    parts[1];

    const deviceId =
    parts[2];

    // =========================================
    // DEVICE DATA
    // =========================================

    if(type === "data")
    {
      await supabase
      .from("device_data")
      .insert({

        device_id:
        deviceId,

        voltage:
        msg.voltage,

        current:
        msg.current,

        status:
        msg.status
      });

      console.log(
        "DATA SAVED"
      );
    }

    // =========================================
    // DEVICE STATUS
    // =========================================

    if(type === "status")
    {
      await supabase
      .from("device_status")
      .upsert({

        device_id:
        deviceId,

        mode:
        msg.mode,

        updated_at:
        new Date()
      });

      console.log(
        "STATUS SAVED"
      );
    }

  } catch(err) {

    console.log(err);
  }
});

// =====================================================
// RELAY CONTROL API
// =====================================================

app.post(
"/control",
async(req,res)=>{

  try {

    const {
      device_id,
      mode
    } = req.body;

    const topic =
    `relay/control/${device_id}`;

    const payload =
    JSON.stringify({
      mode: mode
    });

    mqttClient.publish(
      topic,
      payload
    );

    console.log(
      topic,
      payload
    );

    res.json({
      success:true
    });

  } catch(err) {

    console.log(err);

    res.status(500).json({
      success:false
    });
  }
});

// =====================================================
// GET LATEST DATA
// =====================================================

app.post(
"/data",
async(req,res)=>{

  try {

    const {
      device_id
    } = req.body;

    const { data } =
    await supabase
    .from("device_data")
    .select("*")
    .eq(
      "device_id",
      device_id
    )
    .order("id", {
      ascending:false
    })
    .limit(1)
    .single();

    res.json(data);

  } catch(err) {

    console.log(err);

    res.status(500).json({
      success:false
    });
  }
});

// =====================================================
// GET STATUS
// =====================================================

app.post(
"/status",
async(req,res)=>{

  try {

    const {
      device_id
    } = req.body;

    const { data } =
    await supabase
    .from("device_status")
    .select("*")
    .eq(
      "device_id",
      device_id
    )
    .single();

    res.json(data);

  } catch(err) {

    console.log(err);

    res.status(500).json({
      success:false
    });
  }
});

// =====================================================
// SERVER
// =====================================================

app.listen(3000, ()=>{

  console.log(
    "SERVER RUNNING ON PORT 3000"
  );
});