import logging

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import DatabaseError, IntegrityError, transaction
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Employer
from .serializers import EmployerLoginSerializer, EmployerRegisterSerializer, EmployerSerializer

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def employer_register(request):
    """Create an employer account (User + Employer profile) and sign them in."""
    serializer = EmployerRegisterSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning('Rejected employer registration: invalid payload %s', serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=data['contact_email'], email=data['contact_email'], password=data['password'],
            )
            employer = Employer.objects.create(
                user=user, name=data['name'], contact_email=data['contact_email'],
            )
            token = Token.objects.create(user=user)
    except (DatabaseError, IntegrityError):
        logger.exception('Database error while registering employer with email=%r', data['contact_email'])
        return Response(
            {'detail': 'Could not create your account at this time.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    logger.info('Employer registered: id=%s name=%r email=%r', employer.id, employer.name, employer.contact_email)
    return Response(
        {'token': token.key, 'employer': EmployerSerializer(employer).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def employer_login(request):
    serializer = EmployerLoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = authenticate(request, username=data['contact_email'], password=data['password'])
    if user is None or not hasattr(user, 'employer_profile'):
        logger.warning('Rejected employer login for email=%r: invalid credentials', data['contact_email'])
        return Response({'detail': 'Incorrect email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        token, _ = Token.objects.get_or_create(user=user)
    except DatabaseError:
        logger.exception('Database error while logging in employer_id=%s', user.employer_profile.id)
        return Response(
            {'detail': 'Could not sign you in at this time.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    logger.info('Employer logged in: id=%s email=%r', user.employer_profile.id, data['contact_email'])
    return Response({'token': token.key, 'employer': EmployerSerializer(user.employer_profile).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def employer_logout(request):
    try:
        request.user.auth_token.delete()
    except (DatabaseError, Token.DoesNotExist):
        logger.exception('Failed to delete auth token for user_id=%s', request.user.id)
        return Response({'detail': 'Could not sign you out at this time.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    logger.info('Employer logged out: user_id=%s', request.user.id)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employer_me(request):
    if not hasattr(request.user, 'employer_profile'):
        return Response({'detail': 'Not an employer account.'}, status=status.HTTP_403_FORBIDDEN)
    return Response(EmployerSerializer(request.user.employer_profile).data)
