const addForm = document.querySelector('.add')
const list = document.querySelector('.todos')
const search = document.querySelector('.search input')


const generateTemplate = todo => {


    const html = ` <li class ="list-group-item d-flex justify-content-between align-items-center">
                    <span>${todo}</span>
                     <span class="delete-btn" style="cursor: pointer;">&#128465;</span>
                
                </li>`;
                list.innerHTML += html;
}


addForm.addEventListener('submit', e => {
    e.preventDefault();
    const todo= addForm.add.value.trim();
    // console.log(todo)

   if(todo.length) {
    generateTemplate(todo)
   
    addForm.reset()
   }
})

// Delete todos
list.addEventListener('click', e => {
  if (e.target.classList.contains('delete-btn')) {
    e.target.parentElement.remove();
  }
});

// Filter function
const filterTodos = term => {
 
    Array.from(list.children)
     .filter((todo) => !todo.textContent.toLowerCase().includes(term))
        
     .forEach((todo) =>  todo.classList.add('filtered'))
     
    Array.from(list.children)
     .filter((todo) => todo.textContent.includes(term))
        
     .forEach((todo) =>  todo.classList.remove('filtered'))
     
}


//Keyup Event

search.addEventListener('keyup', () => {
    const term = search.value.trim().toLowerCase();
    filterTodos(term)
})
