module github.com/DigiStratum/{{APP_NAME}}/backend

go 1.23

require (
	github.com/aws/aws-lambda-go v1.41.0
	github.com/aws/aws-sdk-go-v2 v1.41.1
	github.com/aws/aws-sdk-go-v2/config v1.26.1
	github.com/aws/aws-sdk-go-v2/credentials v1.16.12
	github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue v1.20.32
	github.com/aws/aws-sdk-go-v2/service/dynamodb v1.55.0
	github.com/awslabs/aws-lambda-go-api-proxy v0.16.0
	github.com/google/uuid v1.6.0
)
