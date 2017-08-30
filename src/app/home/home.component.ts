import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Params} from '@angular/router';
import { Modal, BSModalContext} from 'ngx-modialog/plugins/bootstrap';
import { overlayConfigFactory } from 'ngx-modialog';

import 'rxjs/Rx';
import swal from 'sweetalert2';

import { OauthService } from '../oauth/services/oauth.service';
import { RedditService} from '../reddit/services/reddit.service';
import {SlotConfirmationModalComponent} from './slot-confirmation.modal.component';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
    private raffleParticipants = [];
    private numSlots = 1;
    private randomSlot: number;
    private commentText: string;
    private unpaidUsers: string;
    private userName: string;
    private currentRaffle;
    private raffleImported = false;
    private calledSpotMessageShown = false;
    private payPalMessageShown = false;
    private paidPopoverProperties = {};
    private closePopOver = false;
    private numOpenSlots = this.numSlots;
    private payPalInfo: string;
    private payPalPmMessage = 'Thank you for participating in the raffle. Please find my PayPal info below:\n\n';
    private popUpTimer: any;
    private skippedPms = [];

    constructor(private activatedRoute: ActivatedRoute, private oauthSerice: OauthService,
                private redditService: RedditService, private modal: Modal) {
    }

    ngOnInit() {
        this.activatedRoute.queryParams.subscribe((params: Params) => {
            if (params['code']) {
                this.oauthSerice.requestAccessToken(params['code'], params['state']).subscribe(res => {
                    if (res.success === true) {
                        this.redditService.getUserDetails().subscribe(userDetailsResponse => {
                                if (userDetailsResponse.name) {
                                    this.userName = userDetailsResponse.name;

                                    this.redditService.getCurrentRaffleSubmission(userDetailsResponse.name)
                                        .subscribe(submissionResponse => {
                                          if (Object.keys(submissionResponse).length !== 0 && submissionResponse.constructor === Object) {
                                              this.currentRaffle = submissionResponse;
                                              this.importRaffleSlots(submissionResponse);
                                          }
                                        },
                                        err => {
                                            console.error(err);
                                        }
                                    );
                                }
                            },
                            err => {
                                console.error(err);
                            }
                        );
                    } else {
                        console.error('error retrieving access token', res);
                    }

                });
            }
        });
        this.updateRaffleSpots(this.numSlots);
    }

    private updateRaffleSpots(updatedNumSplots: number) {
        const prevSpots = this.raffleParticipants.length;
        if (updatedNumSplots > prevSpots) {
            for ( let x = prevSpots; x < updatedNumSplots; x++) {
                this.raffleParticipants[x] = {};
            }
        } else if (updatedNumSplots < prevSpots) {
            this.raffleParticipants.splice(updatedNumSplots, prevSpots - updatedNumSplots);
        }

        let commentControl: any = document.getElementById('commentText');
        commentControl.rows = this.numSlots * 2 + 1;

        this.updateCommentText();
    }

    private generateRandom() {
        let openRaffleSpots = [];
        for (let x = 0; x < this.raffleParticipants.length; x++) {
            if (!this.raffleParticipants[x].name) {
                openRaffleSpots.push(x + 1);
            }
        }
        if (openRaffleSpots.length > 0) {
            const min = 0;
            const max = openRaffleSpots.length - 1;
            const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
            this.randomSlot = openRaffleSpots[randomNum];

            document.getElementById('raffleParticipant' + (this.randomSlot - 1)).focus();
        }
    }

    public updateCommentText() {
        let numSlotsTaken = 0;
        this.commentText = '';
        this.unpaidUsers = '';

        for (let x = 0; x < this.raffleParticipants.length; x++) {
            let raffler = this.raffleParticipants[x];
            if (raffler.name) {
                raffler.name = raffler.name.replace(new RegExp(' ', 'g'), '');
                raffler.name = raffler.name.replace(new RegExp('/[uU]/', 'g'), '');

                numSlotsTaken++;
            }
            this.commentText += ( x + 1) + ' ' + (raffler.name ? '/u/' + raffler.name + ' ' : '') + (raffler.paid ? '**PAID**' : '') + '\n\n';
            this.unpaidUsers += !raffler.paid && raffler.name && this.unpaidUsers.indexOf('/u/' + raffler.name + ' ' ) === -1 ? '/u/' + raffler.name + ' ' : '';
        }

        this.numOpenSlots = this.numSlots - numSlotsTaken;


        if (this.currentRaffle) {
          this.redditService.getSubmission(this.currentRaffle.url + '.json').subscribe(getSubmissionResponse => {
                this.currentRaffle = getSubmissionResponse[0].data.children[0].data;
                const re = /<raffle-tool>[\s\S]*<\/raffle-tool>/;


                let txt: any;
                txt = document.createElement("textareatmp");
                txt.innerHTML = this.currentRaffle.selftext;
                let postText = txt.innerText;

                let slotText = '<raffle-tool>\n\nThis slot list is created and updated by ' +
                    '[The EDC Raffle Tool](https://edc-raffle-tool.firebaseapp.com) by BoyAndHisBlob.\n\n' + this.commentText + '\n\n</raffle-tool>';

                if (postText.indexOf('<raffle-tool>') !== -1 && postText.indexOf('</raffle-tool>') !== -1) {
                    postText = postText.replace(re, slotText);
                } else {
                    postText += '\n\n' + slotText + '\n\n';
                }
                this.redditService.updatePostText(postText, this.currentRaffle.name)
                    .subscribe(postResponse => {
                        },
                        err => {
                            console.error(err);
                        }
                    );
              },
              err => {
                  console.error(err);
              }
          );
        }

    }

    public copyText(elementId: string) {
        let commentControl: any = document.getElementById(elementId);
        commentControl.select();
        document.execCommand('copy');
    }

    public linkWithReddit() {
        this.oauthSerice.requestPermission();
    }

    public importRaffleSlots(raffle: any) {
        const re = /<raffle-tool>[\s\S]*<\/raffle-tool>/;
        let txt: any;
        txt = document.createElement("textareatmp");
        txt.innerHTML = raffle.selftext;
        const postText = txt.innerText;

        const matches = postText.match(re);

        if (matches) {
            this.raffleParticipants = [];
            const slotList = matches[0];
            const slots = slotList.split('\n');
            let numSlots = 0;
            for (let i = 0; i < slots.length; i++) {
                if (slots[i].match(/^[\d]+ /)) {
                    numSlots++;
                    const slotParts = slots[i].split(' ');

                    if (slotParts[1]) {
                       this.raffleParticipants.push({name: slotParts[1].substr(3), paid: slotParts[2] === '**PAID**'});
                    } else {
                        this.raffleParticipants.push({});
                    }
                }
            }
            this.numSlots = numSlots;
            this.updateRaffleSpots(numSlots);
            this.raffleImported = true;
        }


    }

    private checkCalledSpot(event: any) {
        if (!this.calledSpotMessageShown &&
            event.target.value === '' && (!this.randomSlot ||
                (event.target.id !== 'raffleParticipant' + (this.randomSlot - 1)))) {

            swal('Are Called Slots Allowed?',
                'It looks like you are trying to fill a slot that isnt random. ' +
                'Please double check that your raffle allows called slots. You wont get this message again.',
                'question'
            ).then(() => {
            }, (dismiss) => {
            });

            this.calledSpotMessageShown = true;
        }
    }

    private updateAffectedSlots(name: string, event: any) {
        let numAffected = 1;

        this.closePopOver = false;

        for (let x = 0; x < this.raffleParticipants.length; x++) {
            const raffler = this.raffleParticipants[x];
            if (raffler.name && (raffler.name.toUpperCase() === name.toUpperCase())) {
                if (raffler.paid !== event.target.checked) {
                    raffler.paid = event.target.checked;
                    numAffected++;
                }
            }
        }

        this.paidPopoverProperties = {numAffected: numAffected, paid: event.target.checked};

        this.updateCommentText();

        // close popOver after 3 seconds
        clearInterval(this.popUpTimer);
        this.popUpTimer = setInterval(() => {
            this.closePopOver = true;
            clearInterval(this.popUpTimer);
        }, 3000);

    }

    private showPayPalWarning(event: any) {
        if (!this.payPalMessageShown) {
            swal('',
                'Entering your PayPal info will cause <strong>PMs to be sent</strong> to participants as you add them to the slot list. ' +
                'Only newly added participants will be PM\'d. You won\'t get this message again.</br></br>' +
                '<strong>Example PM:</strong></br>' + this.payPalPmMessage + '</br>PayPalEmail@blob.com',
                'info'
            ).then(() => {
            }, (dismiss) => {
            });
            this.payPalMessageShown = true;
        }
    }

    private sendPayPalPm(recipient: string) {
        let recipientNumSlots = 0
        for (let x = 0; x < this.raffleParticipants.length; x++) {
            const raffler = this.raffleParticipants[x];
            if (raffler.name && (raffler.name.toUpperCase() === recipient.toUpperCase())) {
                recipientNumSlots++;
            }
        }

        if (recipient && recipientNumSlots === 1 && this.payPalInfo) {
            this.redditService.sendPm(recipient, 'Raffle PayPal Info',
                this.payPalPmMessage + this.payPalInfo +
                '\n\n^^^.\n\n^(Message auto sent from The EDC Raffle Tool by BoyAndHisBlob.)\n\n').subscribe();
        }
    }

    private donateSlot() {
        let commentText = 'I am donating a random slot to /u/BoyAndHisBlob as a thank you for creating and maintaining the Raffle Tool.' +
            '\n\nThis slot request will be processed in the order it was recieved in the queue.';

        if (this.currentRaffle) {
            swal({
                title: 'Donate Slot?',
                html: 'This will post the below comment to your raffle. Thank you for donating!<br /><br />' + '<i>' + commentText + '</i>',
                type: 'info',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                //cancelButtonColor: '#d33',
                confirmButtonText: 'Donate Slot'
            }).then( () => {
                this.redditService.postComment(commentText, this.currentRaffle.name).subscribe();

                swal(
                    'Donation Comment Posted!',
                    'Please process the slot request in the order it was recieved in the queue and thank you again for your generosity!',
                    'success'
                ).then(() => {
                }, (dismiss) => {
                });
            }, (dismiss) => {
            });
        }
    }

    private runPaymentConfirmer() {
        this.redditService.getPmsAfter(this.currentRaffle.created_utc).subscribe(messages => {
            if (messages && messages.length) {
                this.showPm(messages, messages.length -1);
            } else {
                this.showNoUnpaidPms();
            }
        });
    }

    private showPm(messages: any, messageIndex: number) {
        if (messageIndex < 0) {
            return;
        }

        const message = messages[messageIndex];
        const authorSlotCount = this.getNumberSlots(message.data.author);
        const authorPaid = this.isUserPaid(message.data.author);

        let txt: any;
        txt = document.createElement("temptxt");
        txt.innerHTML = decodeURI(message.data.body_html);

        if (authorSlotCount && !authorPaid && this.skippedPms.indexOf(message.data.name) === -1) {
            swal({
                title: 'Unpaid Raffle Participant PMs',
                html: '<h3 class="text-left"><b>From: ' + message.data.author + ' (' + authorSlotCount + ' total slots)' +
                '<br />Subject: ' + message.data.subject + ' </b>' +
                '</h3> <div class="well text-left">' + txt.innerText + '</div>',
                showCloseButton: true,
                showCancelButton: true,
                cancelButtonText: 'No PayPal Info in PM',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Mark User As Paid'
            }).then(() => {
                this.markAsPaid(message.data.author);
                if (messageIndex !== 0) {
                    this.showPm(messages, messageIndex - 1);
                } else {
                    this.showNoUnpaidPms();
                }
            }, (dismiss) => {
                if (dismiss === 'cancel') {
                    this.skippedPms.push(message.data.name);
                    if (messageIndex !== 0) {
                        this.showPm(messages, messageIndex - 1);
                    } else {
                        this.showNoUnpaidPms();
                    }
                }
            });
        } else if (messageIndex !== 0) {
            this.showPm(messages, messageIndex - 1);
        } else {
            this.showNoUnpaidPms();
        }

    }

    private getNumberSlots(userName: string): number {
        let numUserSlots = 0;
        for (let x = 0; x < this.raffleParticipants.length; x++) {
            const raffler = this.raffleParticipants[x];
            if (raffler.name && (raffler.name.toUpperCase() === userName.toUpperCase())) {
                numUserSlots++;
            }

            if (x + 1 === this.raffleParticipants.length) {
                return numUserSlots;
            }
        }
    }

    private isUserPaid(userName: string): boolean {
        for (let x = 0; x < this.raffleParticipants.length; x++) {
            const raffler = this.raffleParticipants[x];
            if (raffler.name && !raffler.paid && (raffler.name.toUpperCase() === userName.toUpperCase())) {
                return false;
            }

            if (x + 1 === this.raffleParticipants.length) {
                return true;
            }
        }
    }

    private showNoUnpaidPms() {
        let allPaid = this.isAllPaid();

        if (allPaid) {
            swal('All slots are marked paid, congrats on a successful raffle!',
                '',
                'info'
            ).then(() => {
            }, (dismiss) => {
            });
        } else {
            swal('No more PMs from unpaid raffle participants.',
                '',
                'info'
            ).then(() => {
            }, (dismiss) => {
            });
        }
    }

    private markAsPaid(userName: string) {
        for (let x = 0; x < this.raffleParticipants.length; x++) {
            const raffler = this.raffleParticipants[x];
            if (raffler.name && (raffler.name.toUpperCase() === userName.toUpperCase())) {
                raffler.paid = true;
            }

            if (x + 1 === this.raffleParticipants.length) {
                this.updateCommentText();
            }
        }
    }

    private isAllPaid(): boolean {
        for (let x = 0; x < this.raffleParticipants.length; x++) {
            const raffler = this.raffleParticipants[x];
            if (!raffler.paid) {
                return false;
            }

            if (x + 1 === this.raffleParticipants.length) {
                return true;
            }
        }
    }

    private slotAssignmentWizard() {
        this.redditService.getTopLevelComments(this.currentRaffle.permalink, this.currentRaffle.name).subscribe(comments => {
            this.showSlotAssignmentModal(comments, comments.length - 1);
        });
    }

    private showSlotAssignmentModal(comments: any, commentIndex: number) {
        this.modal.open(SlotConfirmationModalComponent,
            overlayConfigFactory({isBlocking: false, comment: comments[commentIndex]}, BSModalContext))
            .then( dialogRef => {
                dialogRef.result.then( result => {
                    console.log(result);
                    if (commentIndex > 0) {
                        this.showSlotAssignmentModal(comments, commentIndex - 1);
                    }
                }).catch(error => console.log(error));
        });
    }

}
