from rest_framework.response import Response
from rest_framework.decorators import api_view
from boiler_park_backend.models import Item, User
from .serializers import ItemSerializer, UserSerializer
import bcrypt


@api_view(['GET'])
def get_data(request):
    items = Item.objects.all()
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def add_item(request):
    serializer = ItemSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
def sign_up(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        name = serializer.validated_data['name']
        password = serializer.validated_data['password']
        parking_pass = serializer.validated_data['parking_pass']
        pass_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_pass = bcrypt.hashpw(pass_bytes, salt)
        user = User(email=email, password=hashed_pass, name=name,
                    parking_pass=parking_pass)
        user.save()
    return Response((serializer.data, hashed_pass))

@api_view(['POST'])
def accept_notification_token(request):
    token = request.data["token"]
    # save token to database
    return Response("Token received")
