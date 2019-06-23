//@ts-check
'use strict';

let moment = require('moment');
let {CacheTimeEnum, toGetCache, CacheOpts} = require('../lib/cache-lib');
let {YESNOENUM} = require('../lib/helpers')

module.exports.submit = (event, context, callback) => {

  let movieRequest = event.queryStringParameters;
  let userId = movieRequest.userId;

  getMovieHistory(userId)
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item),
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error('Couldn\'t fetch details.'));
      return;
    });
};

var currentTime;
async function getMovieHistory(userId) {
  let err, resp;

  currentTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss.SSS');
  console.debug('before calling cache currentTime {}', currentTime);

  [err, resp] = await toGetCache(() => getFreshMovieHistory(userId), new CacheOpts(userId, YESNOENUM.NO, CacheTimeEnum.HOUR, YESNOENUM.YES, YESNOENUM.YES));
  if (err) throw err;

  return resp;
}

async function getFreshMovieHistory(userId){
  console.debug('** Not from cache - from getFreshMovieHistory');
  let resp = {
      userId: userId,
      currentTime: currentTime,
      movieList: [
          {
              movieName: 'movie1',
              date: '06-01-2019'
          },
          {
              movieName: 'movie2',
              date: '06-02-2019'
          },
          {
              movieName: 'movie3',
              date: '06-03-2019'
          },
          {
              movieName: 'movie4',
              date: '06-04-2019'
          },

      ]
  }
  
  return resp;
}
