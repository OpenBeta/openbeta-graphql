# Google Cloud Services (GCS) Integration

We currently store our media in a GCS bucket, many of the below concepts and approaches are generalizable to other storage bucket providers.

## Abstract

Rather than trying to ingest image data through the GQL endpoint, we route the users upload content via a side channel. There are good reasons to do this, especially insofar as resource management on our VMs is concerned.

 ```mermaid
sequenceDiagram
    User->>Openbeta GQL: Here is an image file
    Openbeta GQL->>Openbeta GQL: Check user auth
    Openbeta GQL->>Google Cloud: Can I please have a signed url for my user?
    Google Cloud-->>Openbeta GQL: ofc bb 😘
    Openbeta GQL->> Openbeta GQL: Create entry in database for the pending media
    Openbeta GQL -->>User: Here is an un-reified media object, upload to <signed url>
    User->>Google Cloud: Here is the file
    Google Cloud-->>User: Okay
    Google Cloud->>Openbeta GQL: A new media object just got added with <filename>
    Openbeta GQL->Openbeta GQL: Update the un-reified media object such that it is finalized
```
> From the discussion in [the relevant issue](https://github.com/OpenBeta/openbeta-graphql/issues/443)

This isn't quite exhaustive in terms of the real sequence but it covers the main design. The actual implementation provided support [two patterns](https://cloud.google.com/storage/docs/pubsub-notifications), one for single-node and one for multiple nodes behind a load balanacer.

[Pull pattern](https://cloud.google.com/pubsub/docs/subscriber#subscription_type_comparison) is fine for people hosting a single node in front of their data, or for developers who like to develop with integration to a real life GCS instance.

[Push pattern](https://cloud.google.com/pubsub/docs/subscriber#subscription_type_comparison) works by having a route open `/rest/gc-event`, for example. Google will then send notifications to this endpoint. This will let your load balancing strategy take care of the finer details and you won't need to worry about it.

## How to upload images (Client Docs)

 ```mermaid
sequenceDiagram
    participant Google Cloud
    User->>Openbeta GQL: Here is an image file
    Openbeta GQL -->>User: Here is an un-reified media object, upload to <signed url>
    User->>Google Cloud: Here is a file
    Google Cloud-->>User: Okay
```

This is quite nice, since realistically you can write a query for (n) number of new media objects, and get back signed endpoints for all of them. The google storage bucket is a titan of robustness, so you shouldn't have any trouble uploading to the endpoint.


## Developing

Integration with cloud services is notorious for the headaches it can cause while in a development environment. We are sadly not immune to this, though we try to provide a sane development environment so that contributors can get up and running as quickly as possible.

### Challenges

in principal this logic is perfectly straightforward to test (see the [integration tests](./__tests__/integration.test.ts)) which are quite thorough at checking the sanity of all ends of the pipeline. The challenge is the same one that all integration tests have: It can be a real head-ache to set up all the moving pieces consistently.


### Suggestion to developers

Unless you have to lay hands on bugs to do with integration directly, write your code so that it can be mocked in a sane way.

### How to perform integration testing

You will need to set up google cloud services and update your .env.local with the vars you need. I have included some pointers on how to set up your infrastructure for minimal pain.

## Deployment

This portion of the document will not dabble too much in the details and is not a guide, it will just specify the requisites for parameters.

### Setting up a bucket

Go to your console, navigate to your project (Or make one), and then [Create a bucket](https://cloud.google.com/storage/docs/creating-buckets) inside that project context.

### Setting up notifications for bucket

[sadly notifications don't exactly come out of the box](https://cloud.google.com/storage/docs/reporting-changes#prereqs). After creating your bucket, you can [create a Topic](https://cloud.google.com/pubsub/docs/publish-receive-messages-console#create_a_topic), which will act as a pointer that can recieve events from the bucket.

### Setting up a service account

- Read/Write/Delete on a Storage Bucket: This requires the Storage Object Admin role (roles/storage.objectAdmin) on the specific bucket. This role grants comprehensive control over objects within the bucket.
- Ability to Sign URLs: This requires the storage.buckets.get and storage.objects.create permissions. These are typically included in roles like Storage Object Admin or Storage Admin (roles/storage.admin).
- Permissions to Subscribe to a Pull Subscriber: This requires the Pub/Sub Subscriber role (roles/pubsub.subscriber) on the specific subscription. (OPTIONAL)

To add a service account to your Google Cloud Storage (GCS) project with the specified permissions, you'll need to perform the following steps using the Google Cloud Console or the Google Cloud CLI.

Using the console you can try

 1. Create a Service Account (if you don't have one already):
    - Go to the Service accounts page in the Google Cloud Console.
    - Select your project.
    - Click + CREATE SERVICE ACCOUNT.
    - Enter a Service account name, Service account ID (will be auto-generated), and an optional Service account description.
    - Click CREATE AND CONTINUE.
 1. Grant Permissions to the Service Account:
 2. Download the Service Account Key:
    - Go back to the Service accounts page.
    - Find the service account you created.
    - Click the three dots (Actions) in the Actions column.
    - Select Manage keys.
    - Click ADD KEY and then Create new key.
    - Choose JSON as the Key type (recommended).
    - Click CREATE. The JSON key file will be downloaded to your computer. Keep this file secure. You can drop that file into the repo root or you can extract the private key from it and set an OS env var with it. The API will take either.

#### If you want to use **Pull Subscriptions**

You will also need to add the `roles/pubsub.subscriber` role on your service account, for the subscriber you wish to use (or project-wide)

### Env vars

```bash
# Google Cloud keys and config
GCS_ENABLE_SERVICES=true
GCS_PROJECT_ID=someproject-45031206
GCS_CLOUD_BUCKET_ID=openbeta-test

# Only needed if you intend to use PULL subscriptions, which is only likely
# in the event that you are working on something to do with the GCS cloud,
# otherwise you can just leave it off
# eg: projects/someproject-450306/subscriptions/pull-sub
GCS_NOTIFICATIONS_SUBSCRIPTION=""

# only required in the event that your server is supposed to recieve
# events posted to it by a push subscriber already set up to point to
# you in the GCS. This is practically unheard of in development environments
# since it required instrumentation of HTTPS and DNS setup - or some ngrok
# wizardry, I suppose.
#
# eg: /rest/gcs-event
GCS_MEDIA_HOOK_URL=
# This var is not required, except in the case that you would like to run
# the FULL integration tests on the hook url.
# e.g: https://stg-api.openbeta.io/rest/gcs-event
GCS_MEDIA_HOOK_PUBLIC=

# Check out the readme to see how user can be set up for your purposes.
GCS_BUCKET_CLIENT_EMAIL="openbeta@someproject-45031206.iam.gserviceaccount.com"
GCS_PRIVATE_KEY="BEGIN PRIVATE KEY"
```

You can now set up your env vars in your `.env.local` file, based on the features you woud like to enable. Choose one of `GCS_NOTIFICATIONS_SUBSCRIPTION` or `GCS_MEDIA_HOOK_URL` depending on which strategy you prefer.