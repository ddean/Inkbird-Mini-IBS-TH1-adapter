/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const noble = require('@abandonware/noble');

const {
  Adapter,
  Device,
  Property
} = require('gateway-addon');

class InkbirdMiniIbsTh1 extends Device {
  constructor(adapter, manifest, id) {
    super(adapter, `${InkbirdMiniIbsTh1.name}-${id}`);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
    this['@type'] = ['TemperatureSensor'];
    this.name = manifest.display_name;
    this.description = manifest.description;

    this.addProperty({
      type: 'number',
      '@type': 'TemperatureProperty',
      minimum: -127.99,
      maximum: 127.99,
      multipleOf: 0.01,
      unit: 'degree celsius',
      title: 'temperature',
      description: 'The ambient temperature',
      readOnly: true
    });

    this.addProperty({
      type: 'number',
      minimum: 0,
      maximum: 100,
      multipleOf: 0.01,
      unit: 'percent',
      title: 'humidity',
      description: 'The relative humidity',
      readOnly: true
    });

    this.addProperty({
      type: 'number',
      minimum: 0,
      maximum: 100,
      multipleOf: 1,
      unit: 'percent',
      title: 'battery',
      description: 'The battery voltage',
      readOnly: true
    });
  }

  addProperty(description) {
    const property = new Property(this, description.title, description);
    this.properties.set(description.title, property);
  }

  setData(manufacturerData) {
    const parsedData = {
      temperature: manufacturerData.readUInt16LE(0) / 100.0,
      humidity: manufacturerData.readUInt16LE(2) / 100.0,
      battery: manufacturerData.readUInt8(7)
    };

  const tempProperty = this.properties.get('temperature');
    tempProperty.setCachedValue(parsedData.temperature);
    this.notifyPropertyChanged(tempProperty);

    const humiProperty = this.properties.get('humidity');
    humiProperty.setCachedValue(parsedData.humidity);
    this.notifyPropertyChanged(humiProperty);

    const batteryProperty = this.properties.get('battery');
    batteryProperty.setCachedValue(parsedData.battery);
    this.notifyPropertyChanged(batteryProperty);
  }
}

class InkbirdMiniIbsTh1Adapter extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, InkbirdMiniIbsTh1Adapter.name, manifest.name);
    this.pollInterval = manifest.moziot.config.pollInterval;
    this.knownDevices = {};
    addonManager.addAdapter(this);

    noble.on('stateChange', (state) => {
      console.log('Noble adapter is %s', state);

      if (state === 'poweredOn') {
        console.log('Start scanning for devices');
        noble.startScanning([], true);
      }
    });

    noble.on('discover', (peripheral) => {
      if(peripheral.advertisement && peripheral.advertisement.localName) {

        if(peripheral.advertisement.localName === 'sps' &&
           peripheral.advertisement.manufacturerData &&
           peripheral.advertisement.manufacturerData.length === 9) {
          let manufacturerData = peripheral.advertisement.manufacturerData;

          const id = peripheral.id;
          let knownDevice = this.knownDevices[id];

          if (!knownDevice) {
            console.log(`Detected new Inkbird Mini IBS TH1 with id ${id}`);
            knownDevice = new InkbirdMiniIbsTh1(this, manifest, id);
            this.handleDeviceAdded(knownDevice);
            this.knownDevices[id] = knownDevice;
          }

          knownDevice.setData(manufacturerData);
        }
      }
    });
  }
}

module.exports = InkbirdMiniIbsTh1Adapter;
