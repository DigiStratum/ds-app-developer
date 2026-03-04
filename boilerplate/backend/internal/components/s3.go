package components

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Service provides S3 operations for component artifacts.
type S3Service struct {
	client       *s3.Client
	presignClient *s3.PresignClient
	bucketName   string
}

// NewS3Service creates a new S3 service for component artifacts.
func NewS3Service(bucketName string) (*S3Service, error) {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(cfg)
	presignClient := s3.NewPresignClient(client)

	return &S3Service{
		client:       client,
		presignClient: presignClient,
		bucketName:   bucketName,
	}, nil
}

// buildS3Key builds the S3 object key for a component version.
// Format: {component-name}/{version}.tar.gz
func buildS3Key(componentName, version string) string {
	return fmt.Sprintf("%s/%s.tar.gz", componentName, version)
}

// GenerateUploadURL generates a presigned PUT URL for uploading a component artifact.
// The URL is valid for the specified duration.
func (s *S3Service) GenerateUploadURL(ctx context.Context, componentName, version string, expiry time.Duration) (string, error) {
	key := buildS3Key(componentName, version)

	request, err := s.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(key),
		ContentType: aws.String("application/gzip"),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiry
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate upload URL: %w", err)
	}

	return request.URL, nil
}

// GenerateDownloadURL generates a presigned GET URL for downloading a component artifact.
// The URL is valid for the specified duration.
func (s *S3Service) GenerateDownloadURL(ctx context.Context, componentName, version string, expiry time.Duration) (string, error) {
	key := buildS3Key(componentName, version)

	request, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiry
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate download URL: %w", err)
	}

	return request.URL, nil
}

// DeleteArtifact deletes a component artifact from S3.
func (s *S3Service) DeleteArtifact(ctx context.Context, componentName, version string) error {
	key := buildS3Key(componentName, version)

	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete artifact: %w", err)
	}

	return nil
}

// HeadArtifact checks if an artifact exists and returns its metadata.
func (s *S3Service) HeadArtifact(ctx context.Context, componentName, version string) (*ArtifactMetadata, error) {
	key := buildS3Key(componentName, version)

	result, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		// Check if not found
		return nil, fmt.Errorf("failed to get artifact metadata: %w", err)
	}

	return &ArtifactMetadata{
		Size:         aws.ToInt64(result.ContentLength),
		LastModified: aws.ToTime(result.LastModified),
		ETag:         aws.ToString(result.ETag),
	}, nil
}

// ArtifactMetadata contains S3 object metadata.
type ArtifactMetadata struct {
	Size         int64
	LastModified time.Time
	ETag         string
}
