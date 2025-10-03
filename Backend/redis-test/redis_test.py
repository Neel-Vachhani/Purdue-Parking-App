import redis

r = redis.Redis(
    host='redis-15115.crce197.us-east-2-1.ec2.redns.redis-cloud.com',
    port=15115,
    decode_responses=True,
    username="default",
    password="lWARPY3AGchoeY6xuijbCzWkPnO1eW7u",
)

success = r.set('foo', 'testing, testing, 123')

result = r.get('foo')
print(result)

