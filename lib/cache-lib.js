//@ts-check

let {to, isEmpty, YESNOENUM} = require('./helpers');
var cacheManager = require('cache-manager');
var redisStore = require('cache-manager-redis-store');
const Boom = require('boom');
const jsonpack = require('jsonpack');

var redisTTL = 600;
var redisCache = cacheManager.caching({
  store: redisStore,
  host: 'your.cache.url.com',
  port: 6379, 
  db: 0,
  ttl: redisTTL  //seconds
});

var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 100/*seconds*/});
var multiCache = cacheManager.multiCaching([memoryCache, redisCache]);

var redisClient = redisCache.store.getClient();

redisClient.on('error', (error) => {
    // handle error here
    console.error('redisClient error occurred '+error);
});

function toGetCache(func, cacheOpts) {
    if(!(cacheOpts instanceof CacheOpts)) throw Boom.badImplementation('CacheLib toGetCache - cacheOpts is not correct');
    console.debug('cachelib toGetCache - getting from cache for key '+cacheOpts.key); 
    
    return cacheOpts.cache.wrap(cacheOpts.key,() => compress(cacheOpts, func), {ttl: redisTTL}).then(async data =>  {
        if(cacheOpts.isDebug) await (cacheOpts.cache === multiCache ? printMultiCache(cacheOpts.key): printCache(cacheOpts.key));
        return [null, cacheOpts.isCompress ? jsonpack.unpack(data): data]; 
       })
        .catch(err => [err]);
}

async function compress(cacheOpts, func) {  
    let err, data;
    [err, data] = await to(func());
    if(err) throw Boom.badImplementation('CacheLib compress - error occurred', err);
    return cacheOpts.isCompress ? jsonpack.pack(data): data;
}

function toSetCache(promise, cacheOpts, val) {
    if(!(cacheOpts instanceof CacheOpts)) throw Boom.badImplementation('CacheLib toGetCache - cacheOpts is not correct');
    if(isEmpty(val)) throw Boom.badImplementation('CacheLib toSetCache - value is required');
    
    cacheOpts.cache.set(cacheOpts.key, val, {ttl: redisTTL}, (err) => {
        if (err) throw err;
    });

    return promise.then(async data => {
        if(cacheOpts.isDebug) await (cacheOpts.cache === multiCache ? printMultiCache(cacheOpts.key): printCache(cacheOpts.key));
        return [null, data];
    }).catch(err => {
       multiCache.del(cacheOpts.key);
    [err]});            
}


function printAnyCache(key, cache){    
    return new Promise((resolve, reject) => {
        cache.get(key).then(result =>{
            result = isEmpty(result) ? result: JSON.stringify(result)
            let cacheName = cache === memoryCache ? 'MemoryCache': 'RedisCache';
            console.debug(cacheName+' value for key '+key+' is '+ result);
            resolve(null);
        }).catch(err => {
            console.error('CacheLib printCache - error on getting val for key '+key);
            reject(err);
        });
    });
}

function getFromCache(cacheOpts){    
    return new Promise((resolve, reject) => {
        cacheOpts.cache.get(cacheOpts.key).then(result =>{
            resolve(result);
        }).catch(err => {
            console.error('CacheLib getFromCache - error on getting val for key '+cacheOpts.key);
            reject(err);
        });
    });
}

async function printCacheOpts(cacheOpts){
    await (cacheOpts.cache === redisCache ? printCache(cacheOpts.key) : printMultiCache(cacheOpts.key));
}

async function printCache(key){
    await printAnyCache(key, redisCache);
}

async function printMultiCache(key){
    await printAnyCache(key, memoryCache);
    await printAnyCache(key, redisCache);
}


function deleteCache(cacheOpts){
    multiCache.del(cacheOpts.key);
}

function CacheOpts(key, isMultiFlag, ttlSec, isDebug, isCompress){
    if(!(Object.values(YESNOENUM).includes(isMultiFlag))) throw Boom.badImplementation('CacheOpts - isMultiFlag can only be Y or N');
    if(!(Object.values(YESNOENUM).includes(isCompress))) throw Boom.badImplementation('CacheOpts - isCompress can only be Y or N');
    if(!isEmpty(isDebug) && !(Object.values(YESNOENUM).includes(isDebug))) throw Boom.badImplementation('CacheOpts - isDebug can be empty or only be Y or N');
    if(!isEmpty(ttlSec) && !(Object.values(CacheTimeEnum).includes(ttlSec))) throw Boom.badImplementation('CacheOpts - ttlSec has no value of CacheTimeEnum '+Object.values(CacheTimeEnum));
    
    this.key = key;
    this.cache = isMultiFlag === YESNOENUM.YES ? multiCache: redisCache;
    this.redisTTL = ttlSec;
    this.isDebug = isDebug === YESNOENUM.YES ? true: false;
    this.isCompress = isCompress === YESNOENUM.YES ? true: false;
}

function getKey(domain, prefix, id, subId){
    if(isEmpty(domain)) throw Boom.badImplementation('getKey - domain is required');
    if(isEmpty(prefix)) throw Boom.badImplementation('getKey - prefix is required');
    if(isEmpty(id)) throw Boom.badImplementation('getKey - id is required');
   if(!isEmpty(subId)) return domain+'_'+prefix+'-'+id+'_'+subId;
   
    return domain+'_'+prefix+'-'+id;
}

const CacheTimeEnum = Object.freeze({MINUTE:60, FIVEMINUTES:300, TENMINUTES:600, HALFHOUR:1800, HOUR: 3600, TWOHRS: 7200, HALFDAY: 43200, FULLDAY: 86400, WEEK: 604800, MONTH: 2592000});

module.exports = {
    CacheTimeEnum,
    printCache,
    printCacheOpts,
    printMultiCache,
    deleteCache,
    getKey,
    getFromCache,
    multiCache,
    redisCache,
    toGetCache,
    CacheOpts,
    toSetCache
}

