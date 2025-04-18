import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { empty as observableEmpty, Observable, Observer, throwError as observableThrowError } from 'rxjs';
import { catchError, expand } from 'rxjs/operators';

import { DatabaseService } from '../../database/services/database.service';
import { OauthService } from '../../oauth/services/oauth.service';

@Injectable()
export class RedditService {
  private publicRedditUrl = 'https://www.reddit.com';
  private secureRedditUrl = 'https://oauth.reddit.com';

  private userDetailsUrl = this.secureRedditUrl + '/api/v1/me';
  private userSubmissionsPlaceholder = this.secureRedditUrl + '/user/{userName}/submitted.json?sort=new';
  private editUrl = this.secureRedditUrl + '/api/editusertext';
  private composeUrl = this.secureRedditUrl + '/api/compose';
  private commentUrl = this.secureRedditUrl + '/api/comment';
  private submitUrl = this.secureRedditUrl + '/api/submit';
  private inboxUrl = this.secureRedditUrl + '/message/inbox';
  private childrenUrl = this.secureRedditUrl + '/api/morechildren';
  private infoUrl = this.secureRedditUrl + '/api/info';
  private selectFlairUrl = this.secureRedditUrl + '/api/selectflair';
  private readMessageUrl = this.secureRedditUrl + '/api/read_message';
  private approvedSubs = [
    'WatchURaffle',
    'PenRaffle',
    'RocketLeagueExchange',
    'discoredc',
    'testingground4bots',
    'KnifeRaffle',
    'WrestlingRaffle',
    'SSBM',
    'raffleTest2',
    'lego_raffles',
    'Knife_Swap',
    'FiftyFiftyToken',
    'PokemonRaffles',
  ];
  private subSubmissionAgeDays = {
    RocketLeagueExchange: 7,
    PenRaffle: 7,
    discoredc: 7,
    WatchURaffle: 7,
    testingground4bots: 2,
    WrestlingRaffle: 2,
    KnifeRaffle: 14,
    SSBM: 4,
    raffleTest2: 2,
    lego_raffles: 7,
    Knife_Swap: 2,
    FiftyFiftyToken: 7,
    PokemonRaffles: 7,
  };
  private maxSubmissionAgeDays = 14;

  constructor(private http: HttpClient, private oauthService: OauthService) {}

  public getUserDetails(): Observable<any> {
    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          this.http.get(this.userDetailsUrl, { headers: headers }).subscribe(
            (userDetailsResponse) => {
              observer.next(userDetailsResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public getUserSubmissions(userName: string): Observable<any> {
    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          const re = /{userName}/;
          const userSubmissionsUrl = this.userSubmissionsPlaceholder.replace(re, userName);

          const headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });

          return this.http.get(userSubmissionsUrl, { headers: headers }).subscribe(
            (getResponse) => {
              observer.next(getResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public getPostByName(name: string): Observable<any> {
    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          const headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });

          return this.http.get(this.infoUrl + '?id=' + name, { headers: headers }).subscribe(
            (getResponse) => {
              observer.next(getResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public getCurrentRaffleSubmissions(userName: string) {
    return Observable.create((observer) => {
      this.getUserSubmissions(userName).subscribe(
        (userSubmissionsResponse) => {
          let currentRaffles: any;
          currentRaffles = [];
          if (userSubmissionsResponse && userSubmissionsResponse.data && userSubmissionsResponse.data.children) {
            for (let i = 0; i < userSubmissionsResponse.data.children.length; i++) {
              const submission = userSubmissionsResponse.data.children[i].data;

              const secondsInDay = 24 * 60 * 60;
              const currentDate = new Date();
              const currentDateSeconds = currentDate.getTime() / 1000;
              const submissionAge = currentDateSeconds - submission.created_utc;

              const allowedSubSubmissionAgeDays = this.subSubmissionAgeDays[submission.subreddit];

              // submissions are ordered by age
              // if submissionAge > maxSubmissionAgeDays nothing beyond this will be current
              if (submissionAge > this.maxSubmissionAgeDays * secondsInDay) {
                if (submission.stickied || submission.pinned) {
                  continue;
                } else {
                  break;
                }
              } else if (
                this.approvedSubs.indexOf(submission.subreddit) !== -1 &&
                submissionAge <= allowedSubSubmissionAgeDays * secondsInDay &&
                submission.link_flair_text !== 'Complete' &&
                submission.link_flair_text !== 'Canceled' &&
                submission.link_flair_text !== 'Cancelled'
              ) {
                currentRaffles.push(submission);
              }
            }
          }
          observer.next(currentRaffles);
          observer.complete();
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public updatePostText(postText: string, thing_id: string): Observable<any> {
    if (!postText) {
      return observableThrowError({
        error: 'cannot update post to empty string',
      });
    }

    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let form = new FormData();
          form.append('api_type', 'json');
          form.append('text', postText);
          form.append('thing_id', thing_id);

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          return this.http.post(this.editUrl, form, { headers: headers }).subscribe(
            (editResponse) => {
              observer.next(editResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public getSubmission(submissionPermalink: string): Observable<any> {
    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });

          return this.http
            .get(this.secureRedditUrl + submissionPermalink, {
              headers: headers,
            })
            .subscribe(
              (getResponse) => {
                observer.next(getResponse);
                observer.complete();
              },
              (err) => {
                console.error(err);
                observer.error(err);
              },
            );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public sendPm(recipient: string, subject: string, messageText: string) {
    if (!messageText) {
      return observableThrowError({ error: 'cannot send empty PM!' });
    }

    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let form = new FormData();
          form.append('api_type', 'json');
          form.append('text', messageText);
          form.append('subject', subject);
          form.append('to', recipient);

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          return this.http.post(this.composeUrl, form, { headers: headers }).subscribe(
            (composeResponse) => {
              observer.next(composeResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public postComment(commentText: string, thing_id: string): Observable<any> {
    if (!commentText) {
      return observableThrowError({
        error: 'cannot update post to empty string',
      });
    }

    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let form = new FormData();
          form.append('api_type', 'json');
          form.append('text', commentText);
          form.append('thing_id', thing_id);

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          return this.http.post(this.commentUrl, form, { headers: headers }).subscribe(
            (composeResponse) => {
              observer.next(composeResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public getInbox(after: string, count: number): Observable<any> {
    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let params = '?after=' + after + '&count=' + count + '&limit=100';

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          return this.http.get(this.inboxUrl + params, { headers: headers }).subscribe(
            (pmResponse) => {
              observer.next(pmResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public getPostComments(permalink: string): Observable<any> {
    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          const params = '.json?sort=new';

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          this.http
            .get(this.secureRedditUrl + permalink + params, {
              headers: headers,
            })
            .subscribe(
              (commentsResponse) => {
                observer.next(commentsResponse[1].data.children);
                observer.complete();
              },
              (err) => {
                console.error(err);
                observer.error(err);
              },
            );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public getPmsAfter(createdAfter: number): Observable<any> {
    return Observable.create((observer) => {
      let messages: any = [];
      let itemCount = 0;

      this.getInbox('', itemCount)
        .pipe(
          expand((inboxItems) => {
            let listCount = 0;
            for (let message of inboxItems.data.children) {
              listCount++;
              itemCount++;
              if (message.data.created_utc > createdAfter) {
                if (message.kind === 't4') {
                  messages.push(message);
                }
                if (listCount === inboxItems.data.children.length) {
                  if (inboxItems.data.after) {
                    return this.getInbox(inboxItems.data.after, itemCount);
                  } else {
                    return observableEmpty();
                  }
                }
              } else {
                observer.next(messages);
                observer.complete();
                return observableEmpty();
              }
            }
          }),
          catchError((error) => observer.error(error)),
        )
        .subscribe((resp) => {});
    });
  }

  public getTopLevelComments(permalink: string, link_id: String): Observable<any> {
    return Observable.create((observer) => {
      let topLevelComments = [];

      this.getComments(permalink, false, [], link_id, '')
        .pipe(
          expand((comments) => {
            let child_ids = '';

            for (let z = 0; z < comments.length; z++) {
              let comment = comments[z];
              if (comment.kind === 't1' && comment.data.depth === 0) {
                topLevelComments.push(comment);
              }

              if (z + 1 === comments.length) {
                if (comment.kind === 'more' && comment.data.name !== 't1__') {
                  return this.getComments('', true, comment.data.children, link_id, comment.data.name);
                } else {
                  observer.next(topLevelComments.reverse());
                  observer.complete();
                  return observableEmpty();
                }
              }
            }

            //no comments on post
            if (topLevelComments.length === 0 && comments.length === 0) {
              observer.next(topLevelComments);
              observer.complete();
              return observableEmpty();
            }
          }),
          catchError((error) => observer.error(error)),
        )
        .subscribe((resp) => {});
    });
  }

  private getChildComments(child_ids: any, link_id: String, more_Id: String): Observable<any> {
    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let form = new FormData();
          form.append('api_type', 'json');
          form.append('sort', 'new');
          form.append('link_id', <any>link_id);
          form.append('children', child_ids.join());
          form.append('limit_children', <any>false);
          form.append('depth', <any>0);
          form.append('id', <any>more_Id);

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          return this.http.post(this.childrenUrl, form, { headers: headers }).subscribe(
            (childrenResponse: any) => {
              observer.next(childrenResponse.json.data.things);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public getComments(
    permalink: string,
    getChildren: boolean,
    child_ids: any,
    link_id: String,
    more_Id: String,
  ): Observable<any> {
    return Observable.create((observer) => {
      if (!getChildren) {
        this.getPostComments(permalink).subscribe(
          (comments) => {
            observer.next(comments);
            observer.complete();
          },
          (err) => {
            console.error(err);
            observer.error(err);
          },
        );
      } else {
        this.getChildComments(child_ids, link_id, more_Id).subscribe(
          (comments) => {
            observer.next(comments);
            observer.complete();
          },
          (err) => {
            console.error(err);
            observer.error(err);
          },
        );
      }
    });
  }

  public updateFlair(thingId: string, flairId: string, flairText: string): Observable<any> {
    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let form = new FormData();
          form.append('api_type', 'json');
          if (flairText) {
            form.append('text', flairText);
          }
          form.append('link', thingId);
          form.append('flair_template_id', flairId);

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          return this.http.post(this.selectFlairUrl, form, { headers: headers }).subscribe(
            (flairResponse) => {
              observer.next(flairResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public createTagTrain(tagMessageText, users: string[], thing_id: string): Observable<any> {
    return Observable.create((observer) => {
      if (!users || users.length === 0) {
        observer.next(true);
        observer.complete();
        return;
      }

      let tags = tagMessageText + '\n\n';
      if (users.length > 3) {
        tags += '/u/' + users.pop();
        tags += ' /u/' + users.pop();
        tags += ' /u/' + users.pop();
      } else {
        tags += '/u/' + users.join(' /u/');
        users = [];
      }

      this.postComment(tags, thing_id).subscribe(
        (response) => {
          if (response && response.json && response.json.data && response.json.data.things) {
            let comment = response.json.data.things[0].data;
            this.createTagTrain(tagMessageText, users, comment.name).subscribe(
              (tagTrainResponse) => {
                if (tagTrainResponse) {
                  observer.next(true);
                  observer.complete();
                }
              },
              (err) => {
                console.error(err);
                observer.error(err);
              },
            );
          } else {
            console.error(response);
            observer.error(response);
          }
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public tagUsersInComment(users: string[], thing_id: string): Observable<any> {
    return Observable.create((observer) => {
      if (!users || users.length === 0) {
        observer.next(true);
        observer.complete();
        return;
      }

      let tags = '';
      if (users.length > 3) {
        tags += '/u/' + users.pop();
        tags += ' /u/' + users.pop();
        tags += ' /u/' + users.pop();
      } else {
        tags += '/u/' + users.join(' /u/');
        users = [];
      }

      this.postComment(tags, thing_id).subscribe(
        (response) => {
          if (response && response.json && response.json.data && response.json.data.things) {
            this.tagUsersInComment(users, thing_id).subscribe(
              (tagTrainResponse) => {
                if (tagTrainResponse) {
                  observer.next(true);
                  observer.complete();
                }
              },
              (err) => {
                console.error(err);
                observer.error(err);
              },
            );
          } else {
            console.error(response);
            observer.error(response);
          }
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public submitRaffle(subreddit: string, title: string, body: string): Observable<any> {
    if (!subreddit || !title || !body) {
      return observableThrowError({
        error: 'Cannot submit without subreddit, title, and body',
      });
    }

    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let form = new FormData();
          form.append('api_type', 'json');
          form.append('kind', 'self');
          form.append('sr', subreddit);
          form.append('title', title);
          form.append('text', body);

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          return this.http.post(this.submitUrl, form, { headers: headers }).subscribe(
            (composeResponse) => {
              observer.next(composeResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  public markMessageRead(messageId: string): Observable<any> {
    if (!messageId) {
      return observableThrowError({
        error: 'Missing message',
      });
    }

    return Observable.create((observer) => {
      this.oauthService.getAccessToken().subscribe(
        (response) => {
          let form = new FormData();
          form.append('api_type', 'json');
          form.append('id', messageId);

          let headers = new HttpHeaders({
            Authorization: 'Bearer ' + response.access_token,
          });
          headers.append('Accept', 'application/json');
          return this.http.post(this.readMessageUrl, form, { headers: headers }).subscribe(
            (markReadResponse) => {
              observer.next(markReadResponse);
              observer.complete();
            },
            (err) => {
              console.error(err);
              observer.error(err);
            },
          );
        },
        (err) => {
          console.error(err);
          observer.error(err);
        },
      );
    });
  }

  private handleErrorObservable(error: HttpResponse<any> | any) {
    console.error(error.message || error);
    return observableThrowError(error.message || error);
  }
}
