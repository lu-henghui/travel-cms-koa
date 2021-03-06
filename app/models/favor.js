'use strict';

const { InfoCrudMixin } = require('lin-mizar/lin/interface');
const { merge } = require('lodash');
const { Sequelize, Model } = require('sequelize');
const { db } = require('lin-mizar/lin/db');

class Favor extends Model {
  toJSON () {
    let origin = {
      eid: this.eid,
      art_id: this.art_id,
      type: this.type,
      create_time: this.createTime
    };
    return origin;
  }
}

Favor.init(
  {
    eid: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: '用户ID'
    },
    art_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: '类型ID'
    },
    type: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: '类型'
    }
  },
  merge(
    {
      tableName: 'favor',
      modelName: 'favor',
      sequelize: db
    },
    InfoCrudMixin.options
  )
);

module.exports = { Favor };
