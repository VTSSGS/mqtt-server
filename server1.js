const express = require("express");
const mqtt = require("mqtt");
const cors = require("cors");

const { createClient } =
require("@supabase/supabase-js");

// =====================================================
// EXPRESS
// =====================================================

const app = express();

app.use(cors());

app.use(express.json());

// =====================================================
// SUPABASE
// =====================================================

const supabaseUrl =
"https://daobunnwczlherymuqae.supabase.co";

const supabaseKey =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhb2J1bm53Y3psaGVyeW11cWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMzk1OTAsImV4cCI6MjA5NDkxNTU5MH0.U4Cc5fVEHPRJY8QgVtyf5cNutJQKU09H9UWeaTCwEt8";

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
  username: "RMSCLOUDTRIAL",
  password: "Vthink123",
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
    // DATA
    // =========================================

    if(type === "data")
    {
      const { error } =
      await supabase
	await supabase
	.from("device_data")
	.insert({

  	device_id:
  	deviceId,

  	voltage:
  	msg.voltage,

  	current:
  	msg.current,

  	input_freq:
  	msg.input_freq,

  	output_freq:
  	msg.output_freq,

  	status:
  	msg.status

      });

      if(error)
      {
        console.log(error);
      }
      else
      {
        console.log(
          "DATA SAVED"
        );
      }
    }

    // =========================================
    // STATUS
    // =========================================

    if(type === "status")
    {
      const { error } =
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

      if(error)
      {
        console.log(error);
      }
      else
      {
        console.log(
          "STATUS SAVED"
        );
      }
    }

  } catch(err) {

    console.log(err);
  }
});

// =====================================================
// CONTROL API
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
      "CONTROL SENT"
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
// GET DATA
// =====================================================

app.post(
"/data",
async(req,res)=>{

  try {

    const {
      device_id
    } = req.body;

    const { data, error } =
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

    if(error)
    {
      return res.status(500)
      .json({
        success:false
      });
    }

    res.json(data);

  } catch(err) {

    console.log(err);

    res.status(500).json({
      success:false
    });
  }
});

// =====================================================
// STATUS
// =====================================================

app.post(
"/status",
async(req,res)=>{

  try {

    const {
      device_id
    } = req.body;

    const { data, error } =
    await supabase
    .from("device_status")
    .select("*")
    .eq(
      "device_id",
      device_id
    )
    .single();

    if(error)
    {
      return res.status(500)
      .json({
        success:false
      });
    }

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