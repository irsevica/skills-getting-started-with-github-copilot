document.addEventListener('DOMContentLoaded', init);

async function init() {
  const activitiesList = document.getElementById('activities-list');
  const activitySelect = document.getElementById('activity');
  const signupForm = document.getElementById('signup-form');
  const messageEl = document.getElementById('message');

  try {
    const res = await fetch('/activities');
    const data = await res.json();
    renderActivities(data);
    populateSelect(Object.keys(data));
  } catch (err) {
    showMessage('Could not load activities', 'error');
    console.error(err);
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const activityName = activitySelect.value;
    if (!email || !activityName) {
      showMessage('Please provide an email and select an activity', 'error');
      return;
    }

    try {
      const res = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || 'Signup failed');
      }

      const result = await res.json();
      showMessage(result.message, 'success');

      // Update participants list in the DOM (so user sees it immediately)
      const card = document.querySelector(`.activity-card[data-activity="${activityName}"]`);
      if (card) {
        // remove "no participants" placeholder if present
        const placeholder = card.querySelector('.no-participants');
        if (placeholder) placeholder.remove();

        const ul = card.querySelector('.participants-list') || createParticipantsList(card);
        const li = document.createElement('li');
        
        const emailSpan = document.createElement('span');
        emailSpan.textContent = email;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-participant';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Remove participant';
        deleteBtn.onclick = async (e) => {
          e.preventDefault();
          try {
            const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(email)}`, {
              method: 'DELETE'
            });
            
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(errBody.detail || 'Failed to remove participant');
            }
            
            li.remove();
            
            // If this was the last participant, show the "no participants" message
            if (!ul.children.length) {
              ul.remove();
              const none = document.createElement('p');
              none.className = 'no-participants info';
              none.textContent = 'No participants yet';
              card.querySelector('.participants-section').appendChild(none);
            }
            
            showMessage(`Removed ${email} from ${activityName}`, 'success');
          } catch (err) {
            showMessage(err.message || 'Failed to remove participant', 'error');
            console.error(err);
          }
        };
        
        li.appendChild(emailSpan);
        li.appendChild(deleteBtn);
        ul.appendChild(li);
      }

      signupForm.reset();
    } catch (err) {
      showMessage(err.message || 'Signup failed', 'error');
      console.error(err);
    }
  });

  function renderActivities(activities) {
    activitiesList.innerHTML = '';
    for (const [name, a] of Object.entries(activities)) {
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.setAttribute('data-activity', name);

      const title = document.createElement('h4');
      title.textContent = name;

      const desc = document.createElement('p');
      desc.textContent = a.description;

      const schedule = document.createElement('p');
      schedule.innerHTML = `<strong>When:</strong> ${escapeHtml(a.schedule)}`;

      const max = document.createElement('p');
      max.innerHTML = `<strong>Max participants:</strong> ${escapeHtml(String(a.max_participants))}`;

      // Participants section
      const participantsSection = document.createElement('div');
      participantsSection.className = 'participants-section';

      const participantsHeader = document.createElement('h5');
      participantsHeader.textContent = 'Participants';

      participantsSection.appendChild(participantsHeader);

      if (Array.isArray(a.participants) && a.participants.length > 0) {
        const ul = document.createElement('ul');
        ul.className = 'participants-list';
        for (const p of a.participants) {
          const li = document.createElement('li');
          const emailSpan = document.createElement('span');
          emailSpan.textContent = p;
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-participant';
          deleteBtn.innerHTML = '×';
          deleteBtn.title = 'Remove participant';
          deleteBtn.onclick = async (e) => {
            e.preventDefault();
            try {
              const res = await fetch(`/activities/${encodeURIComponent(name)}/participants/${encodeURIComponent(p)}`, {
                method: 'DELETE'
              });
              
              if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || 'Failed to remove participant');
              }
              
              li.remove();
              
              // If this was the last participant, show the "no participants" message
              if (!ul.children.length) {
                ul.remove();
                const none = document.createElement('p');
                none.className = 'no-participants info';
                none.textContent = 'No participants yet';
                participantsSection.appendChild(none);
              }
              
              showMessage(`Removed ${p} from ${name}`, 'success');
            } catch (err) {
              showMessage(err.message || 'Failed to remove participant', 'error');
              console.error(err);
            }
          };
          
          li.appendChild(emailSpan);
          li.appendChild(deleteBtn);
          ul.appendChild(li);
        }
        participantsSection.appendChild(ul);
      } else {
        const none = document.createElement('p');
        none.className = 'no-participants info';
        none.textContent = 'No participants yet';
        participantsSection.appendChild(none);
      }

      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(schedule);
      card.appendChild(max);
      card.appendChild(participantsSection);

      activitiesList.appendChild(card);
    }
  }

  function createParticipantsList(card) {
    let section = card.querySelector('.participants-section');
    if (!section) {
      section = document.createElement('div');
      section.className = 'participants-section';
      
      const header = document.createElement('h5');
      header.textContent = 'Participants';
      section.appendChild(header);
      
      card.appendChild(section);
    }

    // Find existing list or create new one
    let ul = section.querySelector('.participants-list');
    if (!ul) {
      // remove any "no participants" text first
      const placeholder = section.querySelector('.no-participants');
      if (placeholder) placeholder.remove();

      ul = document.createElement('ul');
      ul.className = 'participants-list';
      section.appendChild(ul);
    }
    return ul;
  }

  function populateSelect(names) {
    names.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      activitySelect.appendChild(opt);
    });
  }

  function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');
    clearTimeout(showMessage._timer);
    showMessage._timer = setTimeout(() => messageEl.classList.add('hidden'), 4000);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
